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

type GitProvider = "github" | "gitlab" | "bitbucket"

type RepoInfo = {
  owner: string
  repo: string
  provider: GitProvider
  baseUrl?: string
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

/* -------------------- GIT PROVIDER DETECTION -------------------- */

const detectProvider = (url: string): GitProvider | null => {
  const urlLower = url.toLowerCase()
  if (urlLower.includes("github.com")) return "github"
  if (urlLower.includes("gitlab.com") || urlLower.includes("gitlab.")) return "gitlab"
  if (urlLower.includes("bitbucket.org") || urlLower.includes("bitbucket.")) return "bitbucket"
  return null
}

const parseRepoUrl = (url: string): RepoInfo | null => {
  const provider = detectProvider(url)
  if (!provider) return null

  const cleanUrl = url.replace(".git", "").replace(/\/$/, "")
  
  try {
    const urlObj = new URL(cleanUrl)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    
    if (pathParts.length < 2) return null

    if (provider === "github") {
      const [owner, repo] = pathParts
      return { owner, repo, provider, baseUrl: "https://api.github.com" }
    } else if (provider === "gitlab") {
      const [owner, repo] = pathParts
      return { owner, repo, provider, baseUrl: `https://${urlObj.hostname}/api/v4` }
    } else if (provider === "bitbucket") {
      const [owner, repo] = pathParts
      return { owner, repo, provider, baseUrl: "https://api.bitbucket.org/2.0" }
    }
  } catch {
    return null
  }

  return null
}

/* -------------------- GIT REPO FETCH -------------------- */

const fetchRepoTree = async (
    repoInfo: RepoInfo,
    path = ""
): Promise<RepoNode[]> => {
  const { owner, repo, provider, baseUrl } = repoInfo

  let apiUrl: string
  let transformResponse: (data: any) => RepoNode[]

  if (provider === "github") {
    apiUrl = `${baseUrl}/repos/${owner}/${repo}/contents/${path}`
    transformResponse = (data: any) => {
      if (!Array.isArray(data)) data = [data]
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === "dir" ? "dir" : "file",
        download_url: item.download_url ?? undefined,
        children: item.type === "dir" ? [] : undefined,
        isOpen: false
      }))
    }
  } else if (provider === "gitlab") {
    const encodedPath = path ? encodeURIComponent(path) : ""
    apiUrl = `${baseUrl}/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/tree?recursive=false${encodedPath ? `&path=${encodedPath}` : ""}`
    transformResponse = (data: any) => {
      if (!Array.isArray(data)) data = [data]
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === "tree" ? "dir" : "file",
        download_url: item.type === "blob" ? `${baseUrl}/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/files/${encodeURIComponent(item.path)}/raw?ref=HEAD` : undefined,
        children: item.type === "tree" ? [] : undefined,
        isOpen: false
      }))
    }
  } else if (provider === "bitbucket") {
    // Bitbucket API structure: /src/HEAD/{path} returns HTML, we need to use /src endpoint
    // Note: Bitbucket API v2.0 has limitations for public repos without auth
    // This is a simplified implementation
    apiUrl = `${baseUrl}/repositories/${owner}/${repo}/src/HEAD/${path || ""}`
    transformResponse = (data: any) => {
      // Bitbucket may return different structures, handle both
      let items: any[] = []
      if (Array.isArray(data)) {
        items = data
      } else if (data && data.values && Array.isArray(data.values)) {
        items = data.values
      } else if (data && typeof data === "object") {
        items = Object.keys(data).map(key => ({ name: key, ...data[key] }))
      }
      
      return items.map((item: any) => {
        const itemPath = item.path || item.name || item
        const itemName = typeof itemPath === "string" ? itemPath.split("/").pop() || itemPath : item.name || "unknown"
        const fullPath = path ? `${path}/${itemName}` : itemName
        const itemType = item.type === "commit_directory" || item.type === "directory" ? "dir" : "file"
        
        return {
          name: itemName,
          path: fullPath,
          type: itemType,
          download_url: itemType === "file" && item.links?.self?.href ? item.links.self.href : undefined,
          children: itemType === "dir" ? [] : undefined,
          isOpen: false
        }
      })
    }
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  const res = await fetch(apiUrl)
  if (!res.ok) {
    throw new Error(`${provider} fetch failed: ${res.statusText}`)
  }

  const data = await res.json()
  return transformResponse(data)
}


/* -------------------- FILE TREE -------------------- */

const FileTree: React.FC<{
  nodes: RepoNode[]
  repoInfo: RepoInfo
  level?: number
}> = ({ nodes, repoInfo, level = 0 }) => {
  const [tree, setTree] = useState(nodes)
  const { parseFiles } = useDashboard()

  const toggleFolder = async (index: number) => {
    const node = tree[index]

    if (!node.isOpen && node.children?.length === 0) {
      const children = await fetchRepoTree(repoInfo, node.path)
      node.children = children
    }

    setTree(prev =>
        prev.map((n, i) =>
            i === index ? { ...n, isOpen: !n.isOpen } : n
        )
    )
  }

  const gitFileToFile = async (node: RepoNode): Promise<File> => {
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
    const file = await gitFileToFile(node)
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
                            repoInfo={repoInfo}
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

const clearRepository = (
  setRepoUrl: (v: string) => void,
  setRepoTree: (v: RepoNode[]) => void,
  setRepoInfo: (v: RepoInfo | null) => void
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
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [loadingRepo, setLoadingRepo] = useState(false)

  useEffect(() => {
    const savedRepoUrl = localStorage.getItem(LOCAL_STORAGE_REPO_KEY)
    if (!savedRepoUrl) return

    const parsed = parseRepoUrl(savedRepoUrl)
    if (!parsed) return

    const loadSavedRepo = async () => {
      try {
        setLoadingRepo(true)

        const tree = await fetchRepoTree(parsed)

        setRepoUrl(savedRepoUrl)
        setRepoTree(tree)
        setRepoInfo(parsed)
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
      const tree = await fetchRepoTree(repoInfo)
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

      const parsed = parseRepoUrl(repoUrl)
      if (!parsed) throw new Error("Invalid repo URL. Supported providers: GitHub, GitLab, Bitbucket")

      const tree = await fetchRepoTree(parsed)

      setRepoTree(tree)
      setRepoInfo(parsed)

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
                  repoInfo={repoInfo}
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
