# Wallet Connect Field

## Node Properties

- **type:** `"formWalletConnect"`
- **Additional:** `chains` (string[], supported chains), `requiredBalance` (number)

## Editor Component

Void element — renders a "Connect Wallet" button preview.

## Plugin Config

```tsx
{
  key: "formWalletConnect",
  node: { isElement: true, isVoid: true, component: FormWalletConnectElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

Inherits shared handler. Wallet interactions happen in preview mode only.

## Slash Menu

- **Icon:** `WalletIcon` (lucide-react) or custom SVG
- **Keywords:** `["form", "wallet", "connect", "web3", "crypto", "blockchain", "ethereum"]`
- **Label:** `"Wallet Connect"`

## Validation (Zod)

```tsx
z.object({
  address: z.string().nonempty("Please connect your wallet"),
  chainId: z.number(),
});
```

## Preview Component

"Connect Wallet" button that triggers WalletConnect/MetaMask modal. Displays connected address after connection.

## Special Considerations

- Requires WalletConnect or wagmi setup at the app level
- Form-level config for supported chains and required token balances
