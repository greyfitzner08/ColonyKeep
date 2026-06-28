import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FEMALE_REPRODUCTIVE_STATUS_OPTIONS,
  type FemaleReproductiveStatus,
} from "@/lib/cases/female-reproductive-status";

interface FemaleReproductiveStatusSelectProps {
  value: FemaleReproductiveStatus | "";
  onChange: (value: FemaleReproductiveStatus | "") => void;
  id?: string;
  className?: string;
}

export function FemaleReproductiveStatusSelect({
  value,
  onChange,
  id = "female-reproductive-status",
  className,
}: FemaleReproductiveStatusSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        Reproductive status
      </Label>
      <Select
        value={value || undefined}
        onValueChange={(next) => onChange(next as FemaleReproductiveStatus)}
      >
        <SelectTrigger id={id} className={className ?? "text-base"}>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {FEMALE_REPRODUCTIVE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
