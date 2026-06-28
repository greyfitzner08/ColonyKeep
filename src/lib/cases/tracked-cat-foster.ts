import {
  fosterFacilityLabel,
  normalizeFosterFacilityInput,
  type FosterFacility,
} from "@/lib/cases/foster-facility";
import type { Cat } from "@/lib/types";

export function hasFosterFormAnswer(wentToFoster: "" | "yes" | "no") {
  return wentToFoster === "yes" || wentToFoster === "no";
}

export function validateTrackedCatFosterForm(
  input: {
    wentToFoster: "" | "yes" | "no";
    fosterFacility: FosterFacility | "";
    fosterFacilityOther: string;
  },
  { required }: { required: boolean }
): string | null {
  if (!required && !hasFosterFormAnswer(input.wentToFoster)) {
    return null;
  }
  return validateClinicFixFosterForm(input);
}

export function validateClinicFixFosterForm(input: {
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
}): string | null {
  if (!input.wentToFoster) {
    return "Select whether the cat went to foster/facility or returned to colony.";
  }

  if (input.wentToFoster === "no") return null;

  if (!input.fosterFacility) {
    return "Select where the cat went.";
  }

  if (input.fosterFacility === "other" && !input.fosterFacilityOther.trim()) {
    return "Enter where the cat went.";
  }

  return null;
}

export function fosterFormToPayload(input: {
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
}) {
  return {
    wentToFosterFacility: input.wentToFoster === "yes",
    fosterFacility: input.wentToFoster === "yes" ? input.fosterFacility : null,
    fosterFacilityOther:
      input.wentToFoster === "yes" && input.fosterFacility === "other"
        ? input.fosterFacilityOther.trim()
        : null,
  };
}

export function fosterFieldsFromCat(
  cat: Pick<
    Cat,
    | "went_to_foster_facility"
    | "foster_facility"
    | "foster_facility_other"
    | "return_status"
    | "foster_program"
  >
) {
  if (cat.went_to_foster_facility === false) {
    return {
      went_to_foster_facility: false,
      foster_facility: null,
      foster_facility_other: null,
    };
  }

  if (cat.went_to_foster_facility === true && cat.foster_facility) {
    return normalizeFosterFacilityInput({
      wentToFosterFacility: true,
      fosterFacility: cat.foster_facility,
      fosterFacilityOther: cat.foster_facility_other,
    });
  }

  const returnStatus = cat.return_status?.trim().toLowerCase() ?? "";
  const wentToFoster = returnStatus.includes("foster");

  if (!wentToFoster) {
    return {
      went_to_foster_facility: false,
      foster_facility: null,
      foster_facility_other: null,
    };
  }

  return {
    went_to_foster_facility: true,
    foster_facility: "other" as const,
    foster_facility_other: cat.foster_program?.trim() || "Foster",
  };
}

export function fosterFormFromCat(
  cat: Pick<
    Cat,
    | "went_to_foster_facility"
    | "foster_facility"
    | "foster_facility_other"
    | "return_status"
  >
): {
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
} {
  if (cat.went_to_foster_facility === true) {
    return {
      wentToFoster: "yes",
      fosterFacility: (cat.foster_facility as FosterFacility | null) ?? "",
      fosterFacilityOther: cat.foster_facility_other ?? "",
    };
  }

  if (cat.went_to_foster_facility === false) {
    return {
      wentToFoster: "no",
      fosterFacility: "",
      fosterFacilityOther: "",
    };
  }

  if (cat.return_status?.trim().toLowerCase().includes("foster")) {
    return {
      wentToFoster: "yes",
      fosterFacility: "other",
      fosterFacilityOther: cat.foster_facility_other ?? "",
    };
  }

  return {
    wentToFoster: "",
    fosterFacility: "",
    fosterFacilityOther: "",
  };
}

export function trackedCatReturnFields(input: {
  wentToFosterFacility: boolean;
  fosterFacility?: FosterFacility | null;
  fosterFacilityOther?: string | null;
}) {
  const fosterFields = normalizeFosterFacilityInput(input);
  const label = input.wentToFosterFacility
    ? fosterFacilityLabel(input.fosterFacility, input.fosterFacilityOther)
    : null;

  return {
    ...fosterFields,
    return_status: input.wentToFosterFacility ? "Foster" : "Returned",
    foster_program: label,
  };
}
