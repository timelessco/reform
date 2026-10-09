import { getCountries } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";

import { useFieldBinding } from "./shared";
import type { FieldRendererProps } from "./shared";

const COUNTRY_CODES: ReadonlySet<string> = new Set(getCountries());

const isCountry = (code: string): code is Country => COUNTRY_CODES.has(code);

const PhoneField = ({ element, form, name }: FieldRendererProps<"Phone">) => {
  const { fieldName, ariaLabel, ariaLabelledBy } = useFieldBinding(element, name);

  // Empty whitelist ⇒ all countries: coerce [] to undefined so the dropdown isn't emptied.
  // Stored codes arrive as plain strings; drop anything outside the library's ISO set.
  const allowedCountries = element.allowedCountries?.length
    ? element.allowedCountries.filter(isCountry)
    : undefined;

  return (
    <form.AppField name={fieldName}>
      {(f) => (
        <>
          <f.PhoneInput
            id={fieldName}
            placeholder={element.placeholder}
            autoComplete="tel"
            // Author whitelist restricts the country dropdown; unset/empty ⇒ all countries.
            // Default to the first allowed; unset ⇒ PhoneInput auto-detects from the browser locale.
            countries={allowedCountries}
            defaultCountry={allowedCountries?.[0]}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            variant="sm"
          />
          <f.FieldError />
        </>
      )}
    </form.AppField>
  );
};

export default PhoneField;
