# Payment Field

## Node Properties

- **type:** `"formPayment"`
- **Additional:** `currency` (string, default `"USD"`), `amount` (number), `amountEditable` (boolean)

## Editor Component

Void element — renders a payment amount display. Actual payment processing happens in preview/live mode.

## Plugin Config

```tsx
{
  key: "formPayment",
  node: { isElement: true, isVoid: true, component: FormPaymentElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

Inherits shared handler. Payment form interactions happen in preview mode only.

## Slash Menu

- **Icon:** `CreditCardIcon` (lucide-react)
- **Keywords:** `["form", "payment", "pay", "credit", "card", "stripe", "money"]`
- **Label:** `"Payment"`

## Validation (Zod)

```tsx
z.object({
  paymentIntentId: z.string().nonempty("Payment is required"),
});
```

## Preview Component

Integrate with payment provider (Stripe Elements, etc.). Renders card input fields.

## Special Considerations

- Payment fields may need server-side configuration (API keys, webhook URLs)
- Consider storing payment provider settings at the form level, not the field level
