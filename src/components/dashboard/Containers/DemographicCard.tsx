"use client";
import Image from "next/image";

import CountryMap from "../CountryMap";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Dropdown } from "../../ui/dropdown/Dropdown";
import { DropdownItem } from "../../ui/dropdown/DropdownItem";
import BaseView from '@/components/dashboard/BaseView'
import { DashboardContainer } from '@/types/containers'

export default function DemographicCard({container}: { container: DashboardContainer<any>}) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <BaseView body={
      <>
        <div className="px-4 py-6 my-6 overflow-hidden border border-gary-200 rounded-2xl bg-gray-50 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div
            id="mapOne"
            className="mapOne map-btn -mx-4 -my-6 h-[212px] w-[252px] 2xsm:w-[307px] xsm:w-[358px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
          >
            <CountryMap />
          </div>
        </div>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  USA
                </p>
                <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                2,379 Customers
              </span>
              </div>
            </div>

            <div className="flex w-full max-w-[140px] items-center gap-3">
              <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                <div className="absolute left-0 top-0 flex h-full w-[79%] items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"></div>
              </div>
              <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                79%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="items-center w-full rounded-full max-w-8">
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  France
                </p>
                <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                589 Customers
              </span>
              </div>
            </div>

            <div className="flex w-full max-w-[140px] items-center gap-3">
              <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                <div className="absolute left-0 top-0 flex h-full w-[23%] items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"></div>
              </div>
              <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                23%
              </p>
            </div>
          </div>
        </div>
      </>
    } configuration={<></>} container={container}/>
  );
}
