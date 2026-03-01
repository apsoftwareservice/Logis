import React, { useEffect } from "react"
import { DashboardContainer, ActionModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import BaseView from '@/components/dashboard/BaseView'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import success from '@lottie/success.json'
import failure from '@lottie/error.json'
import loader from '@lottie/Loadder.json'
import { ActionConfigurationPopover } from '@/components/ui/popover/ActionConfigurationPopover'
import { Button } from '@/components/ui/button'
import { Play } from "lucide-react"

export function ActionView({container}: { container: DashboardContainer<ActionModel> }) {
  const {setContainer} = useDashboard()
  const [ isSuccess, setIsSuccess ] = React.useState<boolean | undefined>()
  const [ isLoading, setIsLoading ] = React.useState(false)

  useEffect(() => {
    if (isSuccess !== undefined) {
      const timeoutId = setTimeout(() => {
        setIsSuccess(undefined)
      }, 3000)
      return () => clearTimeout(timeoutId)
    }
  }, [isSuccess])

  const makeHttpRequest = async (config: ActionModel) => {
    if (!config.url || !config.url.trim()) {
      console.warn('ActionView: URL is required')
      return
    }

    try {
      setIsLoading(true)

      // Build URL with query parameters
      let requestUrl = config.url
      if (config.params && config.params.length > 0) {
        try {
          const urlObj = new URL(config.url)
          config.params.forEach(param => {
            if (param.key && param.key.trim()) {
              urlObj.searchParams.append(param.key, param.value)
            }
          })
          requestUrl = urlObj.toString()
        } catch (error) {
          console.error('Invalid URL:', error)
          throw error
        }
      }

      // Build headers
      const headers: Record<string, string> = {}
      if (config.headers && config.headers.length > 0) {
        config.headers.forEach(header => {
          if (header.key && header.key.trim()) {
            headers[header.key] = header.value
          }
        })
      }

      // Build request options
      const requestOptions: RequestInit = {
        method: config.method,
        headers: headers
      }

      // Add body for methods that support it
      if ((config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && config.body) {
        // Try to parse as JSON, if it fails, send as plain text
        try {
          JSON.parse(config.body)
          requestOptions.body = config.body
          headers['Content-Type'] = headers['Content-Type'] || 'application/json'
        } catch {
          requestOptions.body = config.body
        }
      }

      // Make the HTTP request
      console.log(requestUrl,requestOptions)
      const response = await fetch(requestUrl, requestOptions)
      
      // Check if status is 200-204
      if (response.status >= 200 && response.status <= 204) {
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json()
            console.log(responseData)
          } else {
            const responseText = await response.text()
            if (responseText) {
              console.log(responseText)
            }
          }
          setIsSuccess(true)
        } catch (parseError) {
          console.error('Failed to parse response:', parseError)
          // Still mark as success if status code is valid
          setIsSuccess(true)
        }
        setIsLoading(false)
      } else {
        setIsSuccess(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('HTTP request failed:', error)
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  const handleExecute = () => {
    if (!container.data) return
    makeHttpRequest(container.data)
  }

  return (
    <BaseView
      className={ '' }
      menuItems={
        [<Button
            onClick={ handleExecute }
            disabled={ isLoading || !container.data?.url }
            className="w-7 h-7 rounded-full border border-green-600 bg-green-50 dark:border-gray-700"
          >
            <Play className="fill-green-600 stroke-none"/>
          </Button>]
      }
      body={
        <div className="flex flex-col w-full justify-center items-center overflow-hidden gap-4">
          <motion.div
            initial={ {opacity: 0, y: 10} }
            animate={ {opacity: 1, y: 0} }
            transition={ {duration: 0.6, ease: 'easeOut'} }
            className="flex flex-col items-center justify-center"
          >
            <LottieAnimation 
              loop={ isLoading && !isSuccess } 
              animationJson={ isSuccess !== undefined ? (isSuccess ? success : failure) : loader }
              className={ 'items-center justify-center align-middle flex' } 
              height={ '60%' }
              width={ '60%' }
            />
          </motion.div>

          { !container.data?.url && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Configure the HTTP request to enable execution
            </div>
          )}
        </div>
      } 
      configuration={
        <>
          <ActionConfigurationPopover
            currentValue={ container.data }
            onChange={ (config: ActionModel) => {
              setContainer({
                ...container,
                data: config
              })
            } }
          />
        </>
      } 
      container={ container }
    />
  )
}
