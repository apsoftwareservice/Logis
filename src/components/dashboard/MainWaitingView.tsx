import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import React from 'react'
import GridShape from '@/components/common/GridShape'
import { useDashboard } from '@/context/DashboardContext'

export function MainWaitingView({animation, title}: { animation: any, title: string }) {
  const { parseLogFile } = useDashboard()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file && parseLogFile) {
      parseLogFile(file).then()
    }
    // Clear the input so selecting the same file again still triggers onChange
    e.currentTarget.value = ""
  }

  return <div className={ 'flex-col flex justify-between items-center w-full h-full' }>
    <div className={ 'flex-col flex justify-center dark:text-white items-center h-full' }>
      <div dir={ 'rtl' }>
        { title }
      </div>
      <input
        ref={ inputRef }
        type="file"
        className="hidden"
        onChange={ handleFileChange }
      />
      <motion.div
        onClick={ handleButtonClick }
        initial={ {opacity: 0, y: 10} }
        animate={ {opacity: 1, y: 0} }
        transition={ {duration: 0.6, ease: 'easeOut'} }
      >
        <GridShape/>
        <LottieAnimation animationJson={ animation } className={ 'h-[320px]' }/>
      </motion.div>
    </div>
    <div className={ 'h-10 text-gray-400 text-[0.8rem]' }>Pet the cat</div>
  </div>

}