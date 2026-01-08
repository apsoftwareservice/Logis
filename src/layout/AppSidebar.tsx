"use client"

import React, {useEffect, useState} from "react"

import {
  ChevronDownIcon,
  LayoutTemplate, Pin, RefreshCcw, Trash, File as FileIcon, Folder
} from "lucide-react"
import {useSidebar} from "@/context/SidebarContext";
import {useDashboard} from "@/context/DashboardContext";
import {cn} from "@/lib/utils";

const LOCAL_STORAGE_REPO_KEY = "dashboard:preset-repo-url"

/* -------------------- TYPES -------------------- */

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { name: string; path: string }[]
}

type RepoNode = {
  name: string
  path: string
  type: "file" | "dir"
  download_url?: string
  children?: RepoNode[]
  isOpen?: boolean
}

/* -------------------- NAV ITEMS -------------------- */

const navItems: NavItem[] = [
  {
    icon: <LayoutTemplate />,
    name: "Presets"
  }
]

const othersItems: NavItem[] = [
  // {
  //   icon: <PieChartIcon />,
  //   name: "Charts",
  //   subItems: [
  //     { name: "Line Chart", path: "/line-chart" },
  //     { name: "Bar Chart", path: "/bar-chart" }
  //   ]
  // },
  // {
  //   icon: <Box />,
  //   name: "UI Elements",
  //   subItems: [
  //     { name: "Alerts", path: "/alerts" },
  //     { name: "Buttons", path: "/buttons" }
  //   ]
  // }
]

/* -------------------- GITHUB FETCH -------------------- */

const fetchRepoTree = async (
    owner: string,
    repo: string,
    path = ""
): Promise<RepoNode[]> => {
  const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  )

  if (!res.ok) throw new Error("GitHub fetch failed")

  const data = await res.json()

  return data.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    download_url: item.download_url ?? undefined,
    children: item.type === "dir" ? [] : undefined,
    isOpen: false
  }))
}


/* -------------------- FILE TREE -------------------- */

const FileTree: React.FC<{
  nodes: RepoNode[]
  owner: string
  repo: string
  level?: number
}> = ({ nodes, owner, repo, level = 0 }) => {
  const [tree, setTree] = useState(nodes)
  const { parseFiles } = useDashboard()

  const toggleFolder = async (index: number) => {
    const node = tree[index]

    if (!node.isOpen && node.children?.length === 0) {
      const children = await fetchRepoTree(owner, repo, node.path)
      node.children = children
    }

    setTree(prev =>
        prev.map((n, i) =>
            i === index ? { ...n, isOpen: !n.isOpen } : n
        )
    )
  }

  const githubFileToFile = async (node: RepoNode): Promise<File> => {
    if (!node.download_url) {
      throw new Error("No download URL for file")
    }

    const response = await fetch(node.download_url)
    const blob = await response.blob()

    return new File([blob], node.name, {
      type: blob.type || "text/plain"
    })
  }

  const selectNode = async (node: RepoNode) => {
    if (node.type !== "file") return
    const file = await githubFileToFile(node)
    await parseFiles([file])
  }

  return (
      <ul className="space-y-1">
        {tree.map((node, i) => (
            <li key={node.path} style={{ paddingLeft: level * 12 }}>
              {node.type === "dir" ? (
                  <>
                    <button
                        onClick={() => toggleFolder(i)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-white cursor-pointer hover:text-brand-500 dark:hover:text-brand-300"
                    >
                      <ChevronDownIcon
                          className={`w-4 h-4 transition ${
                              node.isOpen ? "rotate-180" : ""
                          }`}
                      />
                      <Folder className={'fill-brand-200'} width={'15px'}/> {node.name}
                    </button>

                    {node.isOpen && node.children && (
                        <FileTree
                            nodes={node.children}
                            owner={owner}
                            repo={repo}
                            level={level + 1}
                        />
                    )}
                  </>
              ) : (
                  <div
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-white cursor-pointer hover:text-brand-500 dark:hover:text-brand-300"
                      onClick={() => selectNode(node)}
                  >
                    <FileIcon width={'15px'}/> {node.name}
                  </div>
              )}
            </li>
        ))}
      </ul>
  )
}

/* -------------------- SIDEBAR -------------------- */

const parseGithubRepoUrl = (url: string) => {
  const parts = url.replace(".git", "").split("/")
  if (parts.length < 5) return null

  const owner = parts[3]
  const repo = parts[4]

  return { owner, repo }
}

const clearRepository = (
  setRepoUrl: (v: string) => void,
  setRepoTree: (v: RepoNode[]) => void,
  setRepoInfo: (v: { owner: string; repo: string } | null) => void
) => {
  localStorage.removeItem(LOCAL_STORAGE_REPO_KEY)
  setRepoUrl("")
  setRepoTree([])
  setRepoInfo(null)
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isHovered, setIsHovered, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [repoTree, setRepoTree] = useState<RepoNode[]>([])
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null)
  const [loadingRepo, setLoadingRepo] = useState(false)

  useEffect(() => {
    const savedRepoUrl = localStorage.getItem(LOCAL_STORAGE_REPO_KEY)
    if (!savedRepoUrl) return

    const parsed = parseGithubRepoUrl(savedRepoUrl)
    if (!parsed) return

    const loadSavedRepo = async () => {
      try {
        setLoadingRepo(true)

        const { owner, repo } = parsed
        const tree = await fetchRepoTree(owner, repo)

        setRepoUrl(savedRepoUrl)
        setRepoTree(tree)
        setRepoInfo({ owner, repo })
      } catch (e) {
        console.warn("Failed to restore saved repo", e)
        localStorage.removeItem(LOCAL_STORAGE_REPO_KEY)
      } finally {
        setLoadingRepo(false)
      }
    }

    loadSavedRepo().then()
  }, [])

  const handleRefreshRepo = async () => {
    if (!repoInfo) return

    try {
      setLoadingRepo(true)
      const tree = await fetchRepoTree(repoInfo.owner, repoInfo.repo)
      setRepoTree(tree)
    } catch (e) {
      console.error("Failed to refresh repository", e)
      alert("Failed to refresh repository")
    } finally {
      setLoadingRepo(false)
    }
  }

  const handleAddRepo = async () => {
    try {
      setLoadingRepo(true)

      const parsed = parseGithubRepoUrl(repoUrl)
      if (!parsed) throw new Error("Invalid repo URL")

      const { owner, repo } = parsed
      const tree = await fetchRepoTree(owner, repo)

      setRepoTree(tree)
      setRepoInfo({ owner, repo })

      // ✅ SAVE TO LOCAL STORAGE
      localStorage.setItem(LOCAL_STORAGE_REPO_KEY, repoUrl)
    } catch (e) {
      console.error(e)
      alert("Failed to load repository")
    } finally {
      setLoadingRepo(false)
    }
  }

  return (
      <aside className={`flex h-full bg-white dark:bg-gray-900 border-r dark:border-gray-700 mb-32 transition-all
      ${isExpanded || isHovered ? "w-[290px]" : "w-[60px]"}`}
          onMouseEnter={() => !isExpanded && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
      >
        <nav className="p-5 space-y-4 w-full">
          <Pin width={'15px'}  className={cn('cursor-pointer dark:text-white', isExpanded && 'fill-black dark:fill-white')} onClick={() => window.innerWidth >= 1024 ? toggleSidebar() : toggleMobileSidebar() }/>
          {/* DASHBOARD */}
          <div className={'flex justify-between w-full text-black dark:text-white'}>
            <button onClick={() => setOpenSubmenu(openSubmenu === 0 ? null : 0)} className="flex items-center gap-3 text-sm font-medium">
              {/*<LayoutTemplate />*/}
              {(isExpanded || isHovered) && "Presets"}
              <ChevronDownIcon className={`ml-auto w-4 h-4 transition ${ openSubmenu === 0 ? "rotate-180" : "" }`}/>
            </button>

            {repoInfo && (isExpanded || isHovered) && (
              <div className="flex gap-2">
                <RefreshCcw onClick={() => loadingRepo && handleRefreshRepo() }
                            className="flex-1 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {openSubmenu === 0 && (isExpanded || isHovered) && (
            <div className="ml-6 space-y-3">
              <div className={'flex gap-2 items-center align-middle justify-between'}>
                <input
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  disabled={!!repoInfo}
                  className="w-full px-2 py-1 text-sm text-black dark:text-white border dark:border-gray-700 rounded disabled:bg-gray-100 dark:disabled:bg-gray-800"
                />
                <Trash onClick={() =>
                    clearRepository(setRepoUrl, setRepoTree, setRepoInfo)
                  }
                  className="flex p-1 text-xs text-red-500 hover:fill-red-600 cursor-pointer"
                >
                </Trash>
              </div>

              { !repoInfo && (
                <button
                  onClick={handleAddRepo}
                  className="w-full py-1 text-sm bg-brand-500 text-white rounded"
                >
                  {loadingRepo ? "Loading..." : "Add Repository"}
                </button>
              )}

              {repoTree.length > 0 && repoInfo && (
                <FileTree
                  nodes={repoTree}
                  owner={repoInfo.owner}
                  repo={repoInfo.repo}
                />
              )}
            </div>
          )}

          {/* OTHERS */}
          {othersItems.map(item => (
            <div key={item.name}>
            <span className="flex items-center gap-3 text-sm">
              {/*{item.icon}*/}
              {(isExpanded || isHovered) && item.name}
            </span>
              </div>
          ))}
        </nav>
      </aside>
  )
}

export default AppSidebar
