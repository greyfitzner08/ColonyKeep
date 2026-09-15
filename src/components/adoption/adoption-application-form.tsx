"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
  PET_CURRENT_STATUSES,
  REHOME_CIRCUMSTANCES,
  RESIDENCE_TYPES,
  emptyAdoptionAnswers,
  emptyAdoptionPet,
  type AdoptionApplicationAnswers,
  type AdoptionApplicationPet,
  type CatLivingPlan,
  type EmploymentStatus,
  type HomeActivity,
  type PetCurrentStatus,
  type RehomeCircumstance,
  type ResidenceType,
  type YesNo,
  type YesNoNa,
  type YesNoUnsure,
} from "@/lib/adoption/application";
import type { AdoptableCat } from "@/lib/adoption/constants";

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
}: {
  name: string;
  value: T | "";
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
}: {
  values: T[];
  options: ChoiceOption<T>[];
  onToggle: (value: T, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function PetFields({
  index,
  pet,
  onChange,
}: {
  index: number;
  pet: AdoptionApplicationPet;
  onChange: (pet: AdoptionApplicationPet) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-semibold">Pet #{index + 1}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={pet.name} onChange={(e) => onChange({ ...pet, name: e.target.value })} />
        </Field>
        <Field label="Age">
          <Input value={pet.age} onChange={(e) => onChange({ ...pet, age: e.target.value })} />
        </Field>
        <Field label="Year acquired">
          <Input
            value={pet.year_acquired}
            onChange={(e) => onChange({ ...pet, year_acquired: e.target.value })}
          />
        </Field>
        <Field label="Type of animal">
          <Input
            value={pet.animal_type}
            onChange={(e) => onChange({ ...pet, animal_type: e.target.value })}
          />
        </Field>
        <Field label="Gender">
          <Input
            value={pet.gender}
            onChange={(e) => onChange({ ...pet, gender: e.target.value })}
          />
        </Field>
        <Field label="Current status">
          <Select
            value={pet.current_status || "__none__"}
            onValueChange={(value) =>
              onChange({
                ...pet,
                current_status: value === "__none__" ? "" : (value as PetCurrentStatus),
              })
            }
          >
            <SelectTrigger>
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
      </div>
    </div>
  );
}

interface AdoptionApplicationFormProps {
  cats: Pick<AdoptableCat, "id" | "name" | "age_description" | "profile_photo_url" | "status">[];
  initialCatId?: string | null;
}

export function AdoptionApplicationForm({ cats, initialCatId }: AdoptionApplicationFormProps) {
  const availableCats = useMemo(
    () => cats.filter((cat) => cat.status === "available" || cat.status === "pending"),
    [cats]
  );
  const initialCat = availableCats.find((cat) => cat.id === initialCatId) ?? null;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catId, setCatId] = useState(initialCat?.id ?? "");
  const [catInterestName, setCatInterestName] = useState(initialCat?.name ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState<AdoptionApplicationAnswers>(emptyAdoptionAnswers);

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

  function validateStep(): string | null {
    if (step === 0) {
      if (!catInterestName.trim()) return "Please enter the cat or kitten you are interested in.";
      if (!answers.lifelong_commitment) return "Please answer the lifelong commitment question.";
    }
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
      if (!email.trim() || !email.includes("@")) return "A valid email is required.";
      if (!phone.trim()) return "Phone number is required.";
      if (!answers.address_line_1.trim() || !answers.city.trim() || !answers.state.trim()) {
        return "Address, city, and state are required.";
      }
      if (!answers.residence_type || !answers.rents) return "Residence type and rent status are required.";
    }
    if (step === 2) {
      if (!answers.employment_status) return "Employment status is required.";
      if (!answers.age_range.trim()) return "Age range is required.";
      if (!answers.adults_in_home.trim()) return "Number of adults is required.";
      if (answers.activity_levels.length === 0) return "Select at least one home activity level.";
      if (!answers.allergic_to_cats) return "Please answer the allergy question.";
    }
    if (step === 3) {
      if (!answers.living_plan) return "Please select indoor/outdoor plans.";
      if (!answers.plan_to_declaw) return "Please answer the declaw question.";
      if (!answers.hours_alone.trim()) return "Please estimate hours alone per day.";
      if (!answers.backup_caregiver.trim()) return "Please name a backup caregiver.";
      if (answers.rehome_circumstances.length === 0) {
        return "Please select rehoming circumstances (or none anticipated).";
      }
      if (!answers.can_pay_vet_costs || !answers.cat_is_family) {
        return "Please complete the veterinary cost and family questions.";
      }
    }
    if (step === 4) {
      if (!answers.had_pets_last_five_years) return "Please answer whether you have had pets.";
    }
    if (step === 5) {
      if (!answers.reference_1_name.trim() || !answers.reference_1_phone.trim()) {
        return "Please provide your first personal reference.";
      }
      if (!answers.reference_2_name.trim() || !answers.reference_2_phone.trim()) {
        return "Please provide your second personal reference.";
      }
    }
    return null;
  }

  function next() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function submit() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/adoption/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cat_id: catId || null,
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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2 text-center">
        <BrandMark className="mx-auto h-12 w-auto" />
        <h1 className="text-2xl font-semibold">Adoption Application</h1>
        <p className="text-sm text-muted-foreground">
          Friends of Feral Felines — thank you for considering adoption.
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
            {availableCats.length > 0 && (
              <Field label="Select a listed cat (optional)">
                <Select
                  value={catId || "__other__"}
                  onValueChange={(value) => {
                    if (value === "__other__") {
                      setCatId("");
                      return;
                    }
                    const cat = availableCats.find((entry) => entry.id === value);
                    setCatId(value);
                    if (cat) setCatInterestName(cat.name);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__other__">Other / type a name</SelectItem>
                    {availableCats.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                        {cat.age_description ? ` · ${cat.age_description}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {catId && availableCats.find((c) => c.id === catId)?.profile_photo_url && (
              <Image
                src={availableCats.find((c) => c.id === catId)!.profile_photo_url!}
                alt={catInterestName}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            )}
            <Field label="Name of the cat or kitten you are interested in adopting">
              <Input
                value={catInterestName}
                onChange={(e) => setCatInterestName(e.target.value)}
              />
            </Field>
            <Field label="How did you hear about the cat or kitten you are interested in adopting?">
              <Textarea
                rows={2}
                value={answers.how_heard}
                onChange={(e) => updateAnswers({ how_heard: e.target.value })}
              />
            </Field>
            <Field label="Are you aware that adopting a cat is a significant, lifelong commitment?">
              <ChoiceGroup
                name="lifelong"
                value={answers.lifelong_commitment}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => updateAnswers({ lifelong_commitment: value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold">Applicant contact information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>
            <Field label="Email address">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Spouse, partner, or housemate’s name" hint="If applicable">
              <Input
                value={answers.housemate_name}
                onChange={(e) => updateAnswers({ housemate_name: e.target.value })}
              />
            </Field>
            <Field label="Address line 1">
              <Input
                value={answers.address_line_1}
                onChange={(e) => updateAnswers({ address_line_1: e.target.value })}
              />
            </Field>
            <Field label="Address line 2" hint="If applicable">
              <Input
                value={answers.address_line_2}
                onChange={(e) => updateAnswers({ address_line_2: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City">
                <Input
                  value={answers.city}
                  onChange={(e) => updateAnswers({ city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={answers.state}
                  onChange={(e) => updateAnswers({ state: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Type of residence">
              <ChoiceGroup
                name="residence"
                value={answers.residence_type}
                options={RESIDENCE_TYPES}
                onChange={(value: ResidenceType) => updateAnswers({ residence_type: value })}
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
            <Field label="Do you rent your residence?">
              <ChoiceGroup
                name="rents"
                value={answers.rents}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => updateAnswers({ rents: value })}
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
            <Field label="What is your current employment status?">
              <ChoiceGroup
                name="employment"
                value={answers.employment_status}
                options={EMPLOYMENT_STATUSES}
                onChange={(value: EmploymentStatus) => updateAnswers({ employment_status: value })}
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
            <Field label="If employed, please list your employer" hint='Enter "N/A" if not applicable'>
              <Input
                value={answers.employer}
                onChange={(e) => updateAnswers({ employer: e.target.value })}
              />
            </Field>
            <Field label="What age range do you fall into?">
              <Input
                placeholder="e.g. 25–34"
                value={answers.age_range}
                onChange={(e) => updateAnswers({ age_range: e.target.value })}
              />
            </Field>
            <Field label="How many adults live in your home?">
              <Input
                value={answers.adults_in_home}
                onChange={(e) => updateAnswers({ adults_in_home: e.target.value })}
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
            <Field label="How would you describe the activity level in your home?" hint="Select all that apply.">
              <MultiChoiceGroup
                values={answers.activity_levels}
                options={HOME_ACTIVITY_OPTIONS}
                onToggle={(value: HomeActivity, checked) => {
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
            <Field label="Is anyone in the home allergic to cats?">
              <ChoiceGroup
                name="allergic"
                value={answers.allergic_to_cats}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Unsure" },
                ]}
                onChange={(value: YesNoUnsure) => updateAnswers({ allergic_to_cats: value })}
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
            <Field label="Will your new cat be kept indoors or outdoors?">
              <ChoiceGroup
                name="living"
                value={answers.living_plan}
                options={CAT_LIVING_PLANS}
                onChange={(value: CatLivingPlan) => updateAnswers({ living_plan: value })}
              />
            </Field>
            <Field label="Do you plan to declaw your cat?">
              <ChoiceGroup
                name="declaw"
                value={answers.plan_to_declaw}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => updateAnswers({ plan_to_declaw: value })}
              />
            </Field>
            <Field label="On average, how many hours per day will your new cat be without human companionship?">
              <Input
                value={answers.hours_alone}
                onChange={(e) => updateAnswers({ hours_alone: e.target.value })}
              />
            </Field>
            <Field label="If the primary caregiver is unavailable, who will care for the cat?">
              <Input
                value={answers.backup_caregiver}
                onChange={(e) => updateAnswers({ backup_caregiver: e.target.value })}
              />
            </Field>
            <Field
              label="Under what circumstances might you need to find a new home for the cat?"
              hint="Select all that apply."
            >
              <MultiChoiceGroup
                values={answers.rehome_circumstances}
                options={REHOME_CIRCUMSTANCES}
                onToggle={(value: RehomeCircumstance, checked) => {
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
            <Field label="Are you willing and able to pay for the veterinary costs of caring for your cat, including routine annual visits and unexpected illness or injury?">
              <ChoiceGroup
                name="vet_costs"
                value={answers.can_pay_vet_costs}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Unsure" },
                ]}
                onChange={(value: YesNoUnsure) => updateAnswers({ can_pay_vet_costs: value })}
              />
            </Field>
            <Field label="Do you consider a cat to be part of the family?">
              <ChoiceGroup
                name="family"
                value={answers.cat_is_family}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => updateAnswers({ cat_is_family: value })}
              />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold">Pet history and veterinary care</h2>
            <Field label="Have you had any pets within the last five years?">
              <ChoiceGroup
                name="had_pets"
                value={answers.had_pets_last_five_years}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(value: YesNo) => {
                  updateAnswers({ had_pets_last_five_years: value });
                  if (value === "yes") ensurePets(1);
                }}
              />
            </Field>
            <Field label="Current or previous veterinarian’s contact information">
              <div className="grid gap-3">
                <Input
                  placeholder="Veterinary practice name"
                  value={answers.vet_practice_name}
                  onChange={(e) => updateAnswers({ vet_practice_name: e.target.value })}
                />
                <Input
                  placeholder="Phone number"
                  value={answers.vet_phone}
                  onChange={(e) => updateAnswers({ vet_phone: e.target.value })}
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
                  onChange={(pet) => setPet(0, pet)}
                />
                <Field label="Do you have a second current or previous pet to list?">
                  <ChoiceGroup
                    name="pet2"
                    value={answers.has_pet_2}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                    onChange={(value: YesNo) => {
                      updateAnswers({ has_pet_2: value });
                      if (value === "yes") ensurePets(2);
                      if (value === "no") updateAnswers({ has_pet_3: "no" });
                    }}
                  />
                </Field>
                {answers.has_pet_2 === "yes" && (
                  <>
                    <PetFields
                      index={1}
                      pet={answers.pets[1] ?? emptyAdoptionPet()}
                      onChange={(pet) => setPet(1, pet)}
                    />
                    <Field label="Do you have a third current or previous pet to list?">
                      <ChoiceGroup
                        name="pet3"
                        value={answers.has_pet_3}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                        onChange={(value: YesNo) => {
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
              <Field label="Full name">
                <Input
                  value={answers.reference_1_name}
                  onChange={(e) => updateAnswers({ reference_1_name: e.target.value })}
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
              <Field label="Phone number">
                <Input
                  value={answers.reference_1_phone}
                  onChange={(e) => updateAnswers({ reference_1_phone: e.target.value })}
                />
              </Field>
            </div>
            <p className="text-sm font-medium">Personal reference #2</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={answers.reference_2_name}
                  onChange={(e) => updateAnswers({ reference_2_name: e.target.value })}
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
              <Field label="Phone number">
                <Input
                  value={answers.reference_2_phone}
                  onChange={(e) => updateAnswers({ reference_2_phone: e.target.value })}
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
