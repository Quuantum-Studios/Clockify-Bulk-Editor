"use client"
import { DateRange, RangeKeyDict } from "react-date-range"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"

export interface DateRangeValue {
  startDate: Date
  endDate: Date
}

export function DateRangePicker({ value, onChange }: { value: DateRangeValue; onChange: (val: DateRangeValue) => void }) {
  return (
    <DateRange
      ranges={[{ ...value, key: "selection" }]}
      onChange={(item: RangeKeyDict) => {
        const sel = item.selection
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
