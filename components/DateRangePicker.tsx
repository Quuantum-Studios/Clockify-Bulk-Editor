"use client"
import { useState } from "react"
import { DateRange, RangeKeyDict } from "react-date-range"
import { addDays } from "date-fns"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"

export interface DateRangeValue {
  startDate: Date
  endDate: Date
}

export function DateRangePicker({ value, onChange }: { value: DateRangeValue; onChange: (val: DateRangeValue) => void }) {
  const [range, setRange] = useState({
    startDate: value.startDate,
    endDate: value.endDate,
    key: "selection"
  })
  return (
    <DateRange
      ranges={[range]}
      onChange={(item: RangeKeyDict) => {
        const sel = item.selection
        setRange(sel)
        onChange({ startDate: sel.startDate, endDate: sel.endDate })
      }}
      moveRangeOnFirstSelection={false}
      showSelectionPreview={true}
      months={1}
      direction="horizontal"
      rangeColors={["#6366f1"]}
    />
  )
}
