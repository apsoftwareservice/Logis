import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import React from 'react'

export function MainWaitingView({ animation, title} : { animation: any, title: string}) {
  return <div className={ 'flex-col flex justify-between items-center w-full h-full'}>
    <div className={'flex-col flex justify-center dark:text-white items-center h-full'}>
      <div dir={ 'rtl' }>
        { title }
      </div>
      <motion.div
        initial={ {opacity: 0, y: 10} }
        animate={ {opacity: 1, y: 0} }
        transition={ {duration: 0.6, ease: 'easeOut'} }
      >
        <LottieAnimation animationJson={ animation } className={ 'h-[320px]' }/>
      </motion.div>
    </div>
      <div className={'h-10 text-gray-400 text-[0.8rem]'}>Drag and Drop</div>
  </div>

}