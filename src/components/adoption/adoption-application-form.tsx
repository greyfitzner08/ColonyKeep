"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CAT_LIVING_PLANS,
  EMPLOYMENT_STATUSES,
  HOME_ACTIVITY_OPTIONS,
  HOW_HEARD_SOURCES,
  PET_CURRENT_STATUSES,
  PET_GENDERS,
  PET_TYPES,
  REHOME_CIRCUMSTANCES,
  RESIDENCE_TYPES,
  APPLICANT_AGE_RANGES,
  emptyAdoptionAnswers,
  emptyAdoptionPet,
  isEmployedStatus,
  validateAdoptionReferences,
  validatePetHistory,
  type AdoptionApplicationAnswers,
  type AdoptionApplicationPet,
  type CatLivingPlan,
  type EmploymentStatus,
  type HomeActivity,
  type HowHeardSource,
  type PetCurrentStatus,
  type RehomeCircumstance,
  type ResidenceType,
  type YesNo,
  type YesNoNa,
  type YesNoUnsure,
} from "@/lib/adoption/application";

const STEPS = [
  "Interest",
  "Contact",
  "Household",
  "Cat care",
  "Pet history",
  "References",
  "Review",
] as const;

type ChoiceOption<T extends string> = { value: T; label: string };

function ChoiceGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  invalid,
  id,
}: {
  name: string;
  value: T | "";
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={invalid ? "flex flex-col gap-2 rounded-md border border-destructive p-2" : "flex flex-col gap-2"}
    >
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function MultiChoiceGroup<T extends string>({
  values,
  options,
  onToggle,
  invalid,
  id,
}: {
  values: T[];
  options: ChoiceOption<T>[];
  onToggle: (value: T, checked: boolean) => void;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={invalid ? "flex flex-col gap-2 rounded-md border border-destructive p-2" : "flex flex-col gap-2"}
    >
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.includes(option.value)}
            onCheckedChange={(checked) => onToggle(option.value, checked === true)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

const invalidClass = "border-destructive focus-visible:ring-destructive";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function PetFields({
  index,
  pet,
  errors,
  onChange,
  clearError,
}: {
  index: number;
  pet: AdoptionApplicationPet;
  errors: Record<string, string>;
  onChange: (pet: AdoptionApplicationPet) => void;
  clearError: (field: string) => void;
}) {
  const typeError = errors[`pet-${index}-type`];
  const typeOtherError = errors[`pet-${index}-type-other`];
  const statusError = errors[`pet-${index}-status`];
  const fixedError = errors[`pet-${index}-fixed`];

  return (
    <div className="space-y-3 rounded-lg border p-4" id={`pet-${index}`}>
      <p className="text-sm font-semibold">Pet #{index + 1}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *" error={errors[`pet-${index}-name`]}>
          <Input
            id={`pet-${index}-name`}
            value={pet.name}
            aria-invalid={Boolean(errors[`pet-${index}-name`])}
            className={errors[`pet-${index}-name`] ? invalidClass : undefined}
            onChange={(e) => {
              clearError(`pet-${index}-name`);
              onChange({ ...pet, name: e.target.value });
            }}
          />
        </Field>
        <Field label="Age *" error={errors[`pet-${index}-age`]}>
          <Input
            id={`pet-${index}-age`}
            value={pet.age}
            aria-invalid={Boolean(errors[`pet-${index}-age`])}
            className={errors[`pet-${index}-age`] ? invalidClass : undefined}
            onChange={(e) => {
              clearError(`pet-${index}-age`);
              onChange({ ...pet, age: e.target.value });
            }}
          />
        </Field>
        <Field label="Year acquired *" error={errors[`pet-${index}-year`]}>
          <Input
            id={`pet-${index}-year`}
            value={pet.year_acquired}
            aria-invalid={Boolean(errors[`pet-${index}-year`])}
            className={errors[`pet-${index}-year`] ? invalidClass : undefined}
            onChange={(e) => {
              clearError(`pet-${index}-year`);
              onChange({ ...pet, year_acquired: e.target.value });
            }}
          />
        </Field>
        <Field label="Pet type *" error={typeError}>
          <Select
            value={pet.animal_type || "__none__"}
            onValueChange={(value) => {
              clearError(`pet-${index}-type`);
              onChange({
                ...pet,
                animal_type: value === "__none__" ? "" : value,
                animal_type_other: value === "other" ? pet.animal_type_other : "",
              });
            }}
          >
            <SelectTrigger
              id={`pet-${index}-type`}
              aria-invalid={Boolean(typeError)}
              className={typeError ? invalidClass : undefined}
            >
              <SelectValue placeholder="Select pet type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select pet type</SelectItem>
              {PET_TYPES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {pet.animal_type === "other" && (
          <Field label="Describe pet type *" error={typeOtherError}>
            <Input
              id={`pet-${index}-type-other`}
              value={pet.animal_type_other}
              aria-invalid={Boolean(typeOtherError)}
              className={typeOtherError ? invalidClass : undefined}
              onChange={(e) => {
                clearError(`pet-${index}-type-other`);
                onChange({ ...pet, animal_type_other: e.target.value });
              }}
            />
          </Field>
        )}
        <Field label="Gender *" error={errors[`pet-${index}-gender`]}>
          <Select
            value={pet.gender || "__none__"}
            onValueChange={(value) => {
              clearError(`pet-${index}-gender`);
              onChange({ ...pet, gender: value === "__none__" ? "" : value });
            }}
          >
            <SelectTrigger
              id={`pet-${index}-gender`}
              aria-invalid={Boolean(errors[`pet-${index}-gender`])}
              className={errors[`pet-${index}-gender`] ? invalidClass : undefined}
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select gender</SelectItem>
              {PET_GENDERS.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Current status *" error={statusError}>
          <Select
            value={pet.current_status || "__none__"}
            onValueChange={(value) => {
              clearError(`pet-${index}-status`);
              if (value !== "in_home") clearError(`pet-${index}-fixed`);
              onChange({
                ...pet,
                current_status: value === "__none__" ? "" : (value as PetCurrentStatus),
                spayed_neutered: value === "in_home" ? pet.spayed_neutered : "",
              });
            }}
          >
            <SelectTrigger
              id={`pet-${index}-status`}
              aria-invalid={Boolean(statusError)}
              className={statusError ? invalidClass : undefined}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select</SelectItem>
              {PET_CURRENT_STATUSES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {pet.current_status === "other" && (
          <Field label="Please describe">
            <Input
              value={pet.current_status_other}
              onChange={(e) => onChange({ ...pet, current_status_other: e.target.value })}
            />
          </Field>
        )}
        {pet.current_status === "in_home" && (
          <Field
            label="Is this pet currently in your home spayed or neutered? *"
            error={fixedError}
          >
            <div
              id={`pet-${index}-fixed`}
              className={fixedError ? "rounded-md border border-destructive p-2" : undefined}
            >
              <ChoiceGroup
                name={`pet-${index}-fixed`}
                value={pet.spayed_neutered}
                options={[
                  { value: "yes", label: "Yes, spayed or neutered" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearError(`pet-${index}-fixed`);
                  onChange({ ...pet, spayed_neutered: value });
                }}
              />
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

interface AdoptionApplicationFormProps {
  initialCatInterestName?: string;
}

export function AdoptionApplicationForm({
  initialCatInterestName = "",
}: AdoptionApplicationFormProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [catInterestName, setCatInterestName] = useState(initialCatInterestName);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState<AdoptionApplicationAnswers>(emptyAdoptionAnswers);
  const formTopRef = useRef<HTMLDivElement>(null);
  const skipInitialScroll = useRef(true);

  useEffect(() => {
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false;
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
    formTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [step]);

  function updateAnswers(patch: Partial<AdoptionApplicationAnswers>) {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }

  function ensurePets(count: number) {
    setAnswers((prev) => {
      const pets = [...prev.pets];
      while (pets.length < count) pets.push(emptyAdoptionPet());
      return { ...prev, pets };
    });
  }

  function setPet(index: number, pet: AdoptionApplicationPet) {
    setAnswers((prev) => {
      const pets = [...prev.pets];
      pets[index] = pet;
      return { ...prev, pets };
    });
  }

  function stepFieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!catInterestName.trim()) {
        errors["adoption-cat-name"] = "Enter the cat or kitten you are interested in.";
      }
      if (!answers.how_heard) errors["adoption-how-heard"] = "Tell us how you heard about the cat.";
      if (answers.how_heard === "other" && !answers.how_heard_other.trim()) {
        errors["adoption-how-heard-other"] = "Describe how you heard about the cat.";
      }
      if (!answers.lifelong_commitment) {
        errors["adoption-lifelong"] = "Answer the lifelong commitment question.";
      }
    }
    if (step === 1) {
      if (!firstName.trim()) errors["adoption-first-name"] = "First name is required.";
      if (!lastName.trim()) errors["adoption-last-name"] = "Last name is required.";
      if (!email.trim() || !email.includes("@")) {
        errors["adoption-email"] = "A valid email is required.";
      }
      if (!phone.trim()) errors["adoption-phone"] = "Phone number is required.";
      if (!answers.address_line_1.trim()) errors["adoption-address"] = "Address is required.";
      if (!answers.city.trim()) errors["adoption-city"] = "City is required.";
      if (!answers.state.trim()) errors["adoption-state"] = "State is required.";
      if (!answers.residence_type) errors["adoption-residence"] = "Residence type is required.";
      if (!answers.rents) errors["adoption-rents"] = "Rent status is required.";
    }
    if (step === 2) {
      if (!answers.employment_status) errors["adoption-employment"] = "Employment status is required.";
      if (!answers.age_range.trim()) errors["adoption-age"] = "Age range is required.";
      if (!answers.adults_in_home.trim()) errors["adoption-adults"] = "Number of adults is required.";
      if (answers.activity_levels.length === 0) {
        errors["adoption-activity"] = "Select at least one home activity level.";
      }
      if (!answers.allergic_to_cats) errors["adoption-allergy"] = "Answer the allergy question.";
    }
    if (step === 3) {
      if (!answers.living_plan) errors["adoption-living"] = "Select indoor or outdoor plans.";
      if (!answers.plan_to_declaw) errors["adoption-declaw"] = "Answer the declaw question.";
      if (!answers.hours_alone.trim()) errors["adoption-hours"] = "Estimate hours alone per day.";
      if (!answers.backup_caregiver.trim()) errors["adoption-backup"] = "Name a backup caregiver.";
      if (answers.rehome_circumstances.length === 0) {
        errors["adoption-rehome"] = "Select rehoming circumstances, or none anticipated.";
      }
      if (!answers.can_pay_vet_costs) errors["adoption-vet-costs"] = "Answer the veterinary cost question.";
      if (!answers.cat_is_family) errors["adoption-family"] = "Answer whether a cat is part of the family.";
    }
    if (step === 4) {
      if (!answers.had_pets_last_five_years) {
        errors["adoption-had-pets"] = "Answer whether you have had pets.";
      }
      for (const entry of validatePetHistory(answers)) {
        errors[entry.field] = entry.message;
      }
      if (answers.had_pets_last_five_years === "yes" && !answers.has_pet_2) {
        errors["adoption-pet-2"] = "Say whether you have a second pet to list.";
      }
      if (answers.has_pet_2 === "yes" && !answers.has_pet_3) {
        errors["adoption-pet-3"] = "Say whether you have a third pet to list.";
      }
    }
    if (step === 5) {
      for (const entry of validateAdoptionReferences(answers)) {
        errors[entry.field] = entry.message;
      }
    }
    return errors;
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function next() {
    const errors = stepFieldErrors();
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      setFieldErrors(errors);
      setError(null);
      window.setTimeout(() => {
        (document.activeElement as HTMLElement | null)?.blur?.();
        document.getElementById(firstField)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }, 50);
      return;
    }
    setError(null);
    setFieldErrors({});
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function submit() {
    const errors = stepFieldErrors();
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      setFieldErrors(errors);
      setError(errors[firstField]);
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/adoption/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cat_interest_name: catInterestName,
        applicant_first_name: firstName,
        applicant_last_name: lastName,
        applicant_email: email,
        applicant_phone: phone,
        answers,
      }),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to submit application");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
        <BrandMark className="mx-auto h-14 w-auto" />
        <CheckCircle className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-semibold">Application received</h1>
        <p className="text-muted-foreground">
          Thank you for your interest in adopting from Friends of Feral Felines. Our adoption team
          will review your application and follow up by email.
        </p>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="mx-auto max-w-2xl scroll-mt-4 space-y-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <BrandMark className="mx-auto h-12 w-auto" />
        <p className="text-xs font-medium uppercase tracking-wide text-blue-800">
          Person applying to adopt
        </p>
        <h1 className="text-2xl font-semibold">Adoption application</h1>
        <p className="text-sm text-muted-foreground">
          Use this form if you want to adopt a cat or kitten. Submitting a cat into the program
          uses the rescue application instead.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs ${
              index === step
                ? "bg-primary text-primary-foreground"
                : index < step
                  ? "bg-muted text-foreground"
                  : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold">Adoption interest</h2>
            <Field
              label="Name of the cat or kitten you are interested in adopting"
              error={fieldErrors["adoption-cat-name"]}
            >
              <Input
                id="adoption-cat-name"
                value={catInterestName}
                aria-invalid={Boolean(fieldErrors["adoption-cat-name"])}
                className={fieldErrors["adoption-cat-name"] ? invalidClass : undefined}
                onChange={(e) => {
                  setCatInterestName(e.target.value);
                  clearFieldError("adoption-cat-name");
                }}
              />
            </Field>
            <Field
              label="How did you hear about the cat or kitten you are interested in adopting?"
              error={fieldErrors["adoption-how-heard"]}
            >
              <Select
                value={answers.how_heard || "__none__"}
                onValueChange={(value) => {
                  clearFieldError("adoption-how-heard");
                  updateAnswers({
                    how_heard: value === "__none__" ? "" : (value as HowHeardSource),
                  });
                }}
              >
                <SelectTrigger
                  id="adoption-how-heard"
                  aria-invalid={Boolean(fieldErrors["adoption-how-heard"])}
                  className={fieldErrors["adoption-how-heard"] ? invalidClass : undefined}
                >
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select an option...</SelectItem>
                  {HOW_HEARD_SOURCES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {answers.how_heard === "other" && (
              <Field label="Please tell us how you heard about the cat" error={fieldErrors["adoption-how-heard-other"]}>
                <Input
                  id="adoption-how-heard-other"
                  value={answers.how_heard_other}
                  aria-invalid={Boolean(fieldErrors["adoption-how-heard-other"])}
                  className={fieldErrors["adoption-how-heard-other"] ? invalidClass : undefined}
                  onChange={(e) => {
                    clearFieldError("adoption-how-heard-other");
                    updateAnswers({ how_heard_other: e.target.value });
                  }}
                />
              </Field>
            )}
            <Field
              label="Are you aware that adopting a cat is a significant, lifelong commitment?"
              error={fieldErrors["adoption-lifelong"]}
            >
              <ChoiceGroup
                id="adoption-lifelong"
                name="lifelong"
                invalid={Boolean(fieldErrors["adoption-lifelong"])}
                value={answers.lifelong_commitment}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearFieldError("adoption-lifelong");
                  updateAnswers({ lifelong_commitment: value });
                }}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold">Applicant contact information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" error={fieldErrors["adoption-first-name"]}>
                <Input
                  id="adoption-first-name"
                  value={firstName}
                  aria-invalid={Boolean(fieldErrors["adoption-first-name"])}
                  className={fieldErrors["adoption-first-name"] ? invalidClass : undefined}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFieldError("adoption-first-name");
                  }}
                />
              </Field>
              <Field label="Last name" error={fieldErrors["adoption-last-name"]}>
                <Input
                  id="adoption-last-name"
                  value={lastName}
                  aria-invalid={Boolean(fieldErrors["adoption-last-name"])}
                  className={fieldErrors["adoption-last-name"] ? invalidClass : undefined}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFieldError("adoption-last-name");
                  }}
                />
              </Field>
            </div>
            <Field label="Email address" error={fieldErrors["adoption-email"]}>
              <Input
                id="adoption-email"
                type="email"
                value={email}
                aria-invalid={Boolean(fieldErrors["adoption-email"])}
                className={fieldErrors["adoption-email"] ? invalidClass : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("adoption-email");
                }}
              />
            </Field>
            <Field label="Phone number" error={fieldErrors["adoption-phone"]}>
              <Input
                id="adoption-phone"
                value={phone}
                aria-invalid={Boolean(fieldErrors["adoption-phone"])}
                className={fieldErrors["adoption-phone"] ? invalidClass : undefined}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("adoption-phone");
                }}
              />
            </Field>
            <Field label="Spouse, partner, or housemate’s name" hint="If applicable">
              <Input
                value={answers.housemate_name}
                onChange={(e) => updateAnswers({ housemate_name: e.target.value })}
              />
            </Field>
            <Field label="Address line 1" error={fieldErrors["adoption-address"]}>
              <Input
                id="adoption-address"
                value={answers.address_line_1}
                aria-invalid={Boolean(fieldErrors["adoption-address"])}
                className={fieldErrors["adoption-address"] ? invalidClass : undefined}
                onChange={(e) => {
                  clearFieldError("adoption-address");
                  updateAnswers({ address_line_1: e.target.value });
                }}
              />
            </Field>
            <Field label="Address line 2" hint="If applicable">
              <Input
                value={answers.address_line_2}
                onChange={(e) => updateAnswers({ address_line_2: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City" error={fieldErrors["adoption-city"]}>
                <Input
                  id="adoption-city"
                  value={answers.city}
                  aria-invalid={Boolean(fieldErrors["adoption-city"])}
                  className={fieldErrors["adoption-city"] ? invalidClass : undefined}
                  onChange={(e) => {
                    clearFieldError("adoption-city");
                    updateAnswers({ city: e.target.value });
                  }}
                />
              </Field>
              <Field label="State" error={fieldErrors["adoption-state"]}>
                <Input
                  id="adoption-state"
                  value={answers.state}
                  aria-invalid={Boolean(fieldErrors["adoption-state"])}
                  className={fieldErrors["adoption-state"] ? invalidClass : undefined}
                  onChange={(e) => {
                    clearFieldError("adoption-state");
                    updateAnswers({ state: e.target.value });
                  }}
                />
              </Field>
            </div>
            <Field label="Type of residence" error={fieldErrors["adoption-residence"]}>
              <ChoiceGroup
                id="adoption-residence"
                name="residence"
                invalid={Boolean(fieldErrors["adoption-residence"])}
                value={answers.residence_type}
                options={RESIDENCE_TYPES}
                onChange={(value: ResidenceType) => {
                  clearFieldError("adoption-residence");
                  updateAnswers({ residence_type: value });
                }}
              />
            </Field>
            {answers.residence_type === "other" && (
              <Field label="Please describe">
                <Input
                  value={answers.residence_type_other}
                  onChange={(e) => updateAnswers({ residence_type_other: e.target.value })}
                />
              </Field>
            )}
            <Field label="Do you rent your residence?" error={fieldErrors["adoption-rents"]}>
              <ChoiceGroup
                id="adoption-rents"
                name="rents"
                invalid={Boolean(fieldErrors["adoption-rents"])}
                value={answers.rents}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearFieldError("adoption-rents");
                  updateAnswers({ rents: value });
                }}
              />
            </Field>
            {answers.rents === "yes" && (
              <>
                <Field label="If you rent, have you been approved to have cats in your residence?">
                  <ChoiceGroup
                    name="rent_cats"
                    value={answers.rent_cats_approved}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                      { value: "not_applicable", label: "Not applicable" },
                    ]}
                    onChange={(value: YesNoNa) => updateAnswers({ rent_cats_approved: value })}
                  />
                </Field>
                <p className="text-sm font-medium">Landlord contact information</p>
                <Field label="Landlord name">
                  <Input
                    value={answers.landlord_name}
                    onChange={(e) => updateAnswers({ landlord_name: e.target.value })}
                  />
                </Field>
                <Field label="Email address">
                  <Input
                    type="email"
                    value={answers.landlord_email}
                    onChange={(e) => updateAnswers({ landlord_email: e.target.value })}
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    value={answers.landlord_phone}
                    onChange={(e) => updateAnswers({ landlord_phone: e.target.value })}
                  />
                </Field>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold">Household information</h2>
            <Field label="What is your current employment status?" error={fieldErrors["adoption-employment"]}>
              <ChoiceGroup
                id="adoption-employment"
                name="employment"
                invalid={Boolean(fieldErrors["adoption-employment"])}
                value={answers.employment_status}
                options={EMPLOYMENT_STATUSES}
                onChange={(value: EmploymentStatus) => {
                  clearFieldError("adoption-employment");
                  updateAnswers({
                    employment_status: value,
                    employer: isEmployedStatus(value) ? answers.employer : "",
                  });
                }}
              />
            </Field>
            {answers.employment_status === "other" && (
              <Field label="Please describe">
                <Input
                  value={answers.employment_status_other}
                  onChange={(e) => updateAnswers({ employment_status_other: e.target.value })}
                />
              </Field>
            )}
            {isEmployedStatus(answers.employment_status) && (
              <Field label="If employed, please list your employer">
                <Input
                  value={answers.employer}
                  onChange={(e) => updateAnswers({ employer: e.target.value })}
                />
              </Field>
            )}
            <Field label="What age range do you fall into?" error={fieldErrors["adoption-age"]}>
              <Select
                value={answers.age_range || "__none__"}
                onValueChange={(value) => {
                  clearFieldError("adoption-age");
                  updateAnswers({ age_range: value === "__none__" ? "" : value });
                }}
              >
                <SelectTrigger
                  id="adoption-age"
                  aria-invalid={Boolean(fieldErrors["adoption-age"])}
                  className={fieldErrors["adoption-age"] ? invalidClass : undefined}
                >
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select age range...</SelectItem>
                  {APPLICANT_AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="How many adults live in your home?" error={fieldErrors["adoption-adults"]}>
              <Input
                id="adoption-adults"
                value={answers.adults_in_home}
                aria-invalid={Boolean(fieldErrors["adoption-adults"])}
                className={fieldErrors["adoption-adults"] ? invalidClass : undefined}
                onChange={(e) => {
                  clearFieldError("adoption-adults");
                  updateAnswers({ adults_in_home: e.target.value });
                }}
              />
            </Field>
            <Field label="Do all adults in the home work outside the home?">
              <ChoiceGroup
                name="adults_work"
                value={answers.adults_work_outside}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "not_applicable", label: "Not applicable" },
                ]}
                onChange={(value: YesNoNa) => updateAnswers({ adults_work_outside: value })}
              />
            </Field>
            <Field label="How many children live in your home? Please include their ages.">
              <Textarea
                rows={2}
                value={answers.children_in_home}
                onChange={(e) => updateAnswers({ children_in_home: e.target.value })}
              />
            </Field>
            <Field
              label="How would you describe the activity level in your home?"
              hint="Select all that apply."
              error={fieldErrors["adoption-activity"]}
            >
              <MultiChoiceGroup
                id="adoption-activity"
                invalid={Boolean(fieldErrors["adoption-activity"])}
                values={answers.activity_levels}
                options={HOME_ACTIVITY_OPTIONS}
                onToggle={(value: HomeActivity, checked) => {
                  clearFieldError("adoption-activity");
                  updateAnswers({
                    activity_levels: checked
                      ? [...answers.activity_levels, value]
                      : answers.activity_levels.filter((entry) => entry !== value),
                  });
                }}
              />
            </Field>
            {answers.activity_levels.includes("other") && (
              <Field label="Please describe">
                <Input
                  value={answers.activity_other}
                  onChange={(e) => updateAnswers({ activity_other: e.target.value })}
                />
              </Field>
            )}
            <Field label="Is anyone in the home allergic to cats?" error={fieldErrors["adoption-allergy"]}>
              <ChoiceGroup
                id="adoption-allergy"
                name="allergic"
                invalid={Boolean(fieldErrors["adoption-allergy"])}
                value={answers.allergic_to_cats}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Unsure" },
                ]}
                onChange={(value: YesNoUnsure) => {
                  clearFieldError("adoption-allergy");
                  updateAnswers({ allergic_to_cats: value });
                }}
              />
            </Field>
            {answers.allergic_to_cats === "yes" && (
              <Field label="If yes, please explain">
                <Textarea
                  rows={2}
                  value={answers.allergic_explanation}
                  onChange={(e) => updateAnswers({ allergic_explanation: e.target.value })}
                />
              </Field>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold">Cat care and commitment</h2>
            <Field label="Will your new cat be kept indoors or outdoors?" error={fieldErrors["adoption-living"]}>
              <ChoiceGroup
                id="adoption-living"
                name="living"
                invalid={Boolean(fieldErrors["adoption-living"])}
                value={answers.living_plan}
                options={CAT_LIVING_PLANS}
                onChange={(value: CatLivingPlan) => {
                  clearFieldError("adoption-living");
                  updateAnswers({ living_plan: value });
                }}
              />
            </Field>
            <Field label="Do you plan to declaw your cat?" error={fieldErrors["adoption-declaw"]}>
              <ChoiceGroup
                id="adoption-declaw"
                name="declaw"
                invalid={Boolean(fieldErrors["adoption-declaw"])}
                value={answers.plan_to_declaw}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearFieldError("adoption-declaw");
                  updateAnswers({ plan_to_declaw: value });
                }}
              />
            </Field>
            <Field
              label="On average, how many hours per day will your new cat be without human companionship?"
              error={fieldErrors["adoption-hours"]}
            >
              <Input
                id="adoption-hours"
                value={answers.hours_alone}
                aria-invalid={Boolean(fieldErrors["adoption-hours"])}
                className={fieldErrors["adoption-hours"] ? invalidClass : undefined}
                onChange={(e) => {
                  clearFieldError("adoption-hours");
                  updateAnswers({ hours_alone: e.target.value });
                }}
              />
            </Field>
            <Field
              label="If the primary caregiver is unavailable, who will care for the cat?"
              error={fieldErrors["adoption-backup"]}
            >
              <Input
                id="adoption-backup"
                value={answers.backup_caregiver}
                aria-invalid={Boolean(fieldErrors["adoption-backup"])}
                className={fieldErrors["adoption-backup"] ? invalidClass : undefined}
                onChange={(e) => {
                  clearFieldError("adoption-backup");
                  updateAnswers({ backup_caregiver: e.target.value });
                }}
              />
            </Field>
            <Field
              label="Under what circumstances might you need to find a new home for the cat?"
              hint="Select all that apply."
              error={fieldErrors["adoption-rehome"]}
            >
              <MultiChoiceGroup
                id="adoption-rehome"
                invalid={Boolean(fieldErrors["adoption-rehome"])}
                values={answers.rehome_circumstances}
                options={REHOME_CIRCUMSTANCES}
                onToggle={(value: RehomeCircumstance, checked) => {
                  clearFieldError("adoption-rehome");
                  updateAnswers({
                    rehome_circumstances: checked
                      ? [...answers.rehome_circumstances, value]
                      : answers.rehome_circumstances.filter((entry) => entry !== value),
                  });
                }}
              />
            </Field>
            {answers.rehome_circumstances.includes("other") && (
              <Field label="Please describe">
                <Input
                  value={answers.rehome_other}
                  onChange={(e) => updateAnswers({ rehome_other: e.target.value })}
                />
              </Field>
            )}
            <Field
              label="Are you willing and able to pay for the veterinary costs of caring for your cat, including routine annual visits and unexpected illness or injury?"
              error={fieldErrors["adoption-vet-costs"]}
            >
              <ChoiceGroup
                id="adoption-vet-costs"
                name="vet_costs"
                invalid={Boolean(fieldErrors["adoption-vet-costs"])}
                value={answers.can_pay_vet_costs}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Unsure" },
                ]}
                onChange={(value: YesNoUnsure) => {
                  clearFieldError("adoption-vet-costs");
                  updateAnswers({ can_pay_vet_costs: value });
                }}
              />
            </Field>
            <Field label="Do you consider a cat to be part of the family?" error={fieldErrors["adoption-family"]}>
              <ChoiceGroup
                id="adoption-family"
                name="family"
                invalid={Boolean(fieldErrors["adoption-family"])}
                value={answers.cat_is_family}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearFieldError("adoption-family");
                  updateAnswers({ cat_is_family: value });
                }}
              />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold">Pet history and veterinary care</h2>
            <Field
              label="Have you had any pets within the last five years?"
              error={fieldErrors["adoption-had-pets"]}
            >
              <ChoiceGroup
                id="adoption-had-pets"
                name="had_pets"
                invalid={Boolean(fieldErrors["adoption-had-pets"])}
                value={answers.had_pets_last_five_years}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  clearFieldError("adoption-had-pets");
                  updateAnswers({ had_pets_last_five_years: value });
                  if (value === "yes") ensurePets(1);
                }}
              />
            </Field>
            <Field
              label="Current or previous veterinarian’s contact information"
              hint={
                answers.had_pets_last_five_years === "yes"
                  ? "Enter the practice name or the phone number."
                  : undefined
              }
              error={fieldErrors["vet-practice"] || fieldErrors["vet-phone"]}
            >
              <div className="grid gap-3">
                <Input
                  id="vet-practice"
                  placeholder="Veterinary practice name"
                  value={answers.vet_practice_name}
                  aria-invalid={Boolean(fieldErrors["vet-practice"])}
                  className={fieldErrors["vet-practice"] ? invalidClass : undefined}
                  onChange={(e) => {
                    clearFieldError("vet-practice");
                    clearFieldError("vet-phone");
                    updateAnswers({ vet_practice_name: e.target.value });
                  }}
                />
                <Input
                  id="vet-phone"
                  placeholder="Phone number"
                  value={answers.vet_phone}
                  aria-invalid={Boolean(fieldErrors["vet-phone"])}
                  className={fieldErrors["vet-phone"] ? invalidClass : undefined}
                  onChange={(e) => {
                    clearFieldError("vet-practice");
                    clearFieldError("vet-phone");
                    updateAnswers({ vet_phone: e.target.value });
                  }}
                />
                <Input
                  placeholder="Veterinarian name, if known"
                  value={answers.vet_name}
                  onChange={(e) => updateAnswers({ vet_name: e.target.value })}
                />
              </div>
            </Field>
            {answers.had_pets_last_five_years === "no" && (
              <Field label="If you have never had a pet, please tell us which veterinarian you plan to use or whether you would like suggestions.">
                <Textarea
                  rows={3}
                  value={answers.never_had_pet_vet_plan}
                  onChange={(e) => updateAnswers({ never_had_pet_vet_plan: e.target.value })}
                />
              </Field>
            )}
            {answers.had_pets_last_five_years === "yes" && (
              <>
                <PetFields
                  index={0}
                  pet={answers.pets[0] ?? emptyAdoptionPet()}
                  errors={fieldErrors}
                  clearError={clearFieldError}
                  onChange={(pet) => setPet(0, pet)}
                />
                <Field
                  label="Do you have a second current or previous pet to list?"
                  error={fieldErrors["adoption-pet-2"]}
                >
                  <ChoiceGroup
                    id="adoption-pet-2"
                    name="pet2"
                    invalid={Boolean(fieldErrors["adoption-pet-2"])}
                    value={answers.has_pet_2}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                    onChange={(value: YesNo) => {
                      clearFieldError("adoption-pet-2");
                      if (value === "no") clearFieldError("adoption-pet-3");
                      updateAnswers(
                        value === "no"
                          ? { has_pet_2: value, has_pet_3: "no" }
                          : { has_pet_2: value }
                      );
                      if (value === "yes") ensurePets(2);
                    }}
                  />
                </Field>
                {answers.has_pet_2 === "yes" && (
                  <>
                    <PetFields
                      index={1}
                      pet={answers.pets[1] ?? emptyAdoptionPet()}
                      errors={fieldErrors}
                      clearError={clearFieldError}
                      onChange={(pet) => setPet(1, pet)}
                    />
                    <Field
                      label="Do you have a third current or previous pet to list?"
                      error={fieldErrors["adoption-pet-3"]}
                    >
                      <ChoiceGroup
                        id="adoption-pet-3"
                        name="pet3"
                        invalid={Boolean(fieldErrors["adoption-pet-3"])}
                        value={answers.has_pet_3}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                        onChange={(value: YesNo) => {
                          clearFieldError("adoption-pet-3");
                          updateAnswers({ has_pet_3: value });
                          if (value === "yes") ensurePets(3);
                        }}
                      />
                    </Field>
                  </>
                )}
                {answers.has_pet_2 === "yes" && answers.has_pet_3 === "yes" && (
                  <PetFields
                    index={2}
                    pet={answers.pets[2] ?? emptyAdoptionPet()}
                    errors={fieldErrors}
                    clearError={clearFieldError}
                    onChange={(pet) => setPet(2, pet)}
                  />
                )}
              </>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-lg font-semibold">References</h2>
            <p className="text-sm font-medium">Personal reference #1</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" error={fieldErrors["reference-1-name"]}>
                <Input
                  id="reference-1-name"
                  value={answers.reference_1_name}
                  aria-invalid={Boolean(fieldErrors["reference-1-name"])}
                  className={fieldErrors["reference-1-name"] ? invalidClass : undefined}
                  onChange={(e) => {
                    updateAnswers({ reference_1_name: e.target.value });
                    clearFieldError("reference-1-name");
                  }}
                />
              </Field>
              <Field label="Relationship to you">
                <Input
                  value={answers.reference_1_relationship}
                  onChange={(e) => updateAnswers({ reference_1_relationship: e.target.value })}
                />
              </Field>
              <Field label="Email address">
                <Input
                  type="email"
                  value={answers.reference_1_email}
                  onChange={(e) => updateAnswers({ reference_1_email: e.target.value })}
                />
              </Field>
              <Field label="Phone number" error={fieldErrors["reference-1-phone"]}>
                <Input
                  id="reference-1-phone"
                  value={answers.reference_1_phone}
                  aria-invalid={Boolean(fieldErrors["reference-1-phone"])}
                  className={fieldErrors["reference-1-phone"] ? invalidClass : undefined}
                  onChange={(e) => {
                    updateAnswers({ reference_1_phone: e.target.value });
                    clearFieldError("reference-1-phone");
                  }}
                />
              </Field>
            </div>
            <p className="text-sm font-medium">Personal reference #2</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" error={fieldErrors["reference-2-name"]}>
                <Input
                  id="reference-2-name"
                  value={answers.reference_2_name}
                  aria-invalid={Boolean(fieldErrors["reference-2-name"])}
                  className={fieldErrors["reference-2-name"] ? invalidClass : undefined}
                  onChange={(e) => {
                    updateAnswers({ reference_2_name: e.target.value });
                    clearFieldError("reference-2-name");
                  }}
                />
              </Field>
              <Field label="Relationship to you">
                <Input
                  value={answers.reference_2_relationship}
                  onChange={(e) => updateAnswers({ reference_2_relationship: e.target.value })}
                />
              </Field>
              <Field label="Email address">
                <Input
                  type="email"
                  value={answers.reference_2_email}
                  onChange={(e) => updateAnswers({ reference_2_email: e.target.value })}
                />
              </Field>
              <Field label="Phone number" error={fieldErrors["reference-2-phone"]}>
                <Input
                  id="reference-2-phone"
                  value={answers.reference_2_phone}
                  aria-invalid={Boolean(fieldErrors["reference-2-phone"])}
                  className={fieldErrors["reference-2-phone"] ? invalidClass : undefined}
                  onChange={(e) => {
                    updateAnswers({ reference_2_phone: e.target.value });
                    clearFieldError("reference-2-phone");
                  }}
                />
              </Field>
            </div>
            <Field label="Do you have any final thoughts, comments, or questions for us?">
              <Textarea
                rows={4}
                value={answers.final_comments}
                onChange={(e) => updateAnswers({ final_comments: e.target.value })}
              />
            </Field>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="text-lg font-semibold">Review & submit</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Cat:</span> {catInterestName}
              </p>
              <p>
                <span className="text-muted-foreground">Applicant:</span> {firstName} {lastName}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {email}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {phone}
              </p>
              <p>
                <span className="text-muted-foreground">Address:</span>{" "}
                {[answers.address_line_1, answers.address_line_2, answers.city, answers.state]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              By submitting, you confirm the information above is accurate. Our adoption team will
              contact you after reviewing your application.
            </p>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={back} disabled={step === 0 || submitting}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
