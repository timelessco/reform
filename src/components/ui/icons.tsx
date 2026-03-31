import type { LucideProps } from "lucide-react";
import {
  AlertCircle as LucideAlertCircle,
  AlignCenter as LucideAlignCenter,
  AtSign as LucideAtSign,
  AlignLeft as LucideAlignLeft,
  AlignRight as LucideAlignRight,
  ArrowDownToLine as LucideArrowDownToLine,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUpToLine as LucideArrowUpToLine,
  AudioLines as LucideAudioLines,
  Ban as LucideBan,
  Bluetooth as LucideBluetooth,
  Bold as LucideBold,
  Braces as LucideBraces,
  Check as LucideCheck,
  CheckCheck as LucideCheckCheck,
  CheckCircle2 as LucideCheckCircle2,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  ChevronsRight as LucideChevronsRight,
  ChevronsUpDown as LucideChevronsUpDown,
  CircleCheck as LucideCircleCheck,
  CirclePlus as LucideCirclePlus,
  CircleX as LucideCircleX,
  Clock as LucideClock,
  CornerDownLeft as LucideCornerDownLeft,
  Crop as LucideCrop,
  Eraser as LucideEraser,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  File as LucideFile,
  FileQuestion as LucideFileQuestion,
  FileText as LucideFileText,
  FileUp as LucideFileUp,
  Film as LucideFilm,
  Filter as LucideFilter,
  Folder as LucideFolder,
  FolderOpen as LucideFolderOpen,
  FolderSearch as LucideFolderSearch,
  GripHorizontal as LucideGripHorizontal,
  GripVertical as LucideGripVertical,
  Hash as LucideHash,
  HelpCircle as LucideHelpCircle,
  Indent as LucideIndent,
  Info as LucideInfo,
  Italic as LucideItalic,
  Keyboard as LucideKeyboard,
  Languages as LucideLanguages,
  Layout as LucideLayout,
  Link as LucideLink,
  List as LucideList,
  ListCollapse as LucideListCollapse,
  ListOrdered as LucideListOrdered,
  ListTodo as LucideListTodo,
  Loader2 as LucideLoader2,
  Lock as LucideLock,
  MessageSquareText as LucideMessageSquareText,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  MoreVertical as LucideMoreVertical,
  OctagonX as LucideOctagonX,
  Outdent as LucideOutdent,
  Palette as LucidePalette,
  PanelLeft as LucidePanelLeft,
  Pen as LucidePen,
  Pencil as LucidePencil,
  Phone as LucidePhone,
  PencilLine as LucidePencilLine,
  Radical as LucideRadical,
  Redo2 as LucideRedo2,
  RefreshCw as LucideRefreshCw,
  Rocket as LucideRocket,
  RotateCcw as LucideRotateCcw,
  Save as LucideSave,
  Shield as LucideShield,
  SquareCheck as LucideSquareCheck,
  Strikethrough as LucideStrikethrough,
  Tag as LucideTag,
  Text as LucideText,
  Trash2 as LucideTrash2,
  TriangleAlert as LucideTriangleAlert,
  Underline as LucideUnderline,
  Undo2 as LucideUndo2,
  Unlink as LucideUnlink,
  Upload as LucideUpload,
  User as LucideUser,
  WrapText as LucideWrapText,
  X as LucideX,
} from "lucide-react";

// Re-export LucideProps type for components that need it
export type { LucideProps };

// ============================================================================
// Custom SVG Icons (already replaced with custom designs)
// ============================================================================

// ============================================================================
// Custom SVG Icons (already replaced with custom designs)
// ============================================================================
export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.25 7.92385C2.25 7.49308 2.25 7.2777 2.30552 7.07935C2.3547 6.90365 2.43552 6.73839 2.54402 6.5917C2.6665 6.4261 2.83652 6.29387 3.17654 6.0294L8.26327 2.07306C8.52676 1.86812 8.65851 1.76565 8.80399 1.72626C8.93235 1.69151 9.06765 1.69151 9.19601 1.72626C9.34149 1.76565 9.47323 1.86812 9.73673 2.07306L14.8235 6.02941C15.1635 6.29387 15.3335 6.4261 15.456 6.5917C15.5645 6.73839 15.6453 6.90365 15.6945 7.07935C15.75 7.2777 15.75 7.49308 15.75 7.92385V13.35C15.75 14.1901 15.75 14.6102 15.5865 14.931C15.4427 15.2133 15.2132 15.4427 14.931 15.5866C14.6101 15.75 14.1901 15.75 13.35 15.75H4.65C3.80992 15.75 3.38988 15.75 3.06901 15.5866C2.78677 15.4427 2.5573 15.2133 2.41349 14.931C2.25 14.6102 2.25 14.1901 2.25 13.35V7.92385Z"
      fill="var(--sidebar-icon-fill)"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.00005 9C7.50888 9 6.30005 10.2088 6.30005 11.7V15.75H11.7V11.7C11.7 10.2088 10.4912 9 9.00005 9Z"
      fill="var(--sidebar-icon-inner)"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.5 12.75C10.3995 12.75 12.75 10.3995 12.75 7.5C12.75 4.6005 10.3995 2.25 7.5 2.25C4.6005 2.25 2.25 4.6005 2.25 7.5C2.25 10.3995 4.6005 12.75 7.5 12.75Z"
      fill="var(--sidebar-icon-stroke)"
      opacity="0.12"
    />
    <path
      d="M15.75 15.75L11.2501 11.25M12.75 7.5C12.75 10.3995 10.3995 12.75 7.5 12.75C4.6005 12.75 2.25 10.3995 2.25 7.5C2.25 4.6005 4.6005 2.25 7.5 2.25C10.3995 2.25 12.75 4.6005 12.75 7.5Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M13.6066 7.14722C13.6066 5.9968 13.1496 4.89351 12.3362 4.08004C11.5227 3.26657 10.4194 2.80957 9.26898 2.80957C8.11857 2.80957 7.01527 3.26657 6.2018 4.08004C5.38833 4.89351 4.93133 5.9968 4.93133 7.14722C4.93133 9.38124 4.36778 10.9108 3.73824 11.9225C3.20721 12.776 2.94169 13.2027 2.95143 13.3217C2.96221 13.4535 2.99013 13.5038 3.09634 13.5825C3.19227 13.6537 3.62468 13.6537 4.48951 13.6537H14.0485C14.9133 13.6537 15.3457 13.6537 15.4416 13.5825C15.5478 13.5038 15.5758 13.4535 15.5865 13.3217C15.5963 13.2027 15.3308 12.776 14.7997 11.9225C14.1702 10.9108 13.6066 9.38124 13.6066 7.14722Z"
      fill="var(--sidebar-icon-stroke)"
      opacity="0.12"
      strokeWidth="var(--stroke-width)"
    />
    <path
      d="M7.35621 13.6537C7.35621 14.5261 7.3562 16.0881 9.26898 16.0881C11.1818 16.0881 11.1818 14.489 11.1818 13.6537M13.6066 7.14722C13.6066 5.9968 13.1496 4.89351 12.3362 4.08004C11.5227 3.26657 10.4194 2.80957 9.26898 2.80957C8.11857 2.80957 7.01527 3.26657 6.2018 4.08004C5.38833 4.89351 4.93133 5.9968 4.93133 7.14722C4.93133 9.38124 4.36778 10.9108 3.73824 11.9225C3.20721 12.776 2.94169 13.2027 2.95143 13.3217C2.96221 13.4535 2.99013 13.5038 3.09634 13.5825C3.19227 13.6537 3.62468 13.6537 4.48951 13.6537H14.0485C14.9133 13.6537 15.3457 13.6537 15.4416 13.5825C15.5478 13.5038 15.5758 13.4535 15.5865 13.3217C15.5963 13.2027 15.3308 12.776 14.7997 11.9225C14.1702 10.9108 13.6066 9.38124 13.6066 7.14722Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="var(--stroke-width)"
    />
  </svg>
);

export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M15.4213 7.9054C14.2486 7.612 13.6924 6.2692 14.3143 5.2333C14.6041 4.7509 14.5168 4.3351 14.2297 4.0489L13.9507 3.7699C13.6645 3.4837 13.2487 3.3964 12.7663 3.6853C11.7295 4.3072 10.3867 3.751 10.0942 2.5783C9.9583 2.032 9.6019 1.7998 9.1969 1.7998H8.8027C8.3977 1.7998 8.0422 2.032 7.9054 2.5783C7.612 3.751 6.2692 4.3072 5.2333 3.6853C4.7509 3.3955 4.3342 3.4828 4.048 3.769L3.769 4.048C3.4828 4.3342 3.3955 4.7509 3.6853 5.2333C4.3072 6.2701 3.751 7.6129 2.5783 7.9054C2.0338 8.0413 1.7998 8.3968 1.7998 8.8027V9.1969C1.7998 9.6019 2.032 9.9574 2.5783 10.0942C3.751 10.3876 4.3072 11.7304 3.6853 12.7663C3.3955 13.2487 3.4828 13.6645 3.7699 13.9507L4.0489 14.2297C4.336 14.5168 4.7527 14.6032 5.2333 14.3143C6.2701 13.6924 7.6129 14.2486 7.9054 15.4213C8.0413 15.9676 8.3977 16.1998 8.8027 16.1998H9.1969C9.6019 16.1998 9.9574 15.9676 10.0942 15.4213C10.3876 14.2486 11.7304 13.6924 12.7663 14.3143C13.2478 14.6032 13.6636 14.5168 13.9507 14.2297L14.2297 13.9507C14.5159 13.6645 14.6032 13.2487 14.3143 12.7663C13.6924 11.7295 14.2486 10.3867 15.4213 10.0942C15.9676 9.9583 16.1998 9.6019 16.1998 9.1969V8.8027C16.1998 8.3968 15.9658 8.0413 15.4213 7.9054Z"
      fill={props.fill || "var(--sidebar-icon-fill)"}
      stroke="var(--sidebar-icon-stroke)"
    />
    <path
      d="M6.2998 8.9998C6.2998 10.4911 7.5085 11.6998 8.9998 11.6998C10.4911 11.6998 11.6998 10.4911 11.6998 8.9998C11.6998 7.5085 10.4911 6.2998 8.9998 6.2998C7.5085 6.2998 6.2998 7.5085 6.2998 8.9998Z"
      fill="var(--sidebar-icon-inner)"
      stroke="var(--sidebar-icon-stroke)"
      strokeWidth="var(--stroke-width)"
    />
  </svg>
);

export const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="18" height="18" rx="9" fill="var(--sidebar)" />
    <path
      d="M9.50895 3.34919C9.4693 3.24639 9.39946 3.15802 9.30861 3.09569C9.21776 3.03336 9.11017 3 9 3C8.88983 3 8.78224 3.03336 8.69139 3.09569C8.60054 3.15802 8.5307 3.24639 8.49105 3.34919L7.39351 6.20269C7.22986 6.62872 7.17804 6.75146 7.10767 6.85074C7.03694 6.94995 6.9501 7.03661 6.85074 7.10712C6.75146 7.17804 6.62872 7.22931 6.20269 7.39351L3.34919 8.49105C3.24639 8.5307 3.15802 8.60054 3.09569 8.69139C3.03336 8.78224 3 8.88983 3 9C3 9.11017 3.03336 9.21776 3.09569 9.30861C3.15802 9.39946 3.24639 9.4693 3.34919 9.50895L6.20269 10.6065C6.62872 10.7701 6.75146 10.822 6.85074 10.8923C6.95002 10.9632 7.03675 11.05 7.10712 11.1493C7.17804 11.2485 7.22931 11.3713 7.39351 11.7973L8.49105 14.6508C8.5307 14.7536 8.60054 14.842 8.69139 14.9043C8.78224 14.9666 8.88983 15 9 15C9.11017 15 9.21776 14.9666 9.30861 14.9043C9.39946 14.842 9.4693 14.7536 9.50895 14.6508L10.6065 11.7973C10.7701 11.3713 10.822 11.2485 10.8923 11.1493C10.9632 11.05 11.05 10.9632 11.1493 10.8929C11.2485 10.822 11.3713 10.7707 11.7973 10.6065L14.6508 9.50895C14.7536 9.4693 14.842 9.39946 14.9043 9.30861C14.9666 9.21776 15 9.11017 15 9C15 8.88983 14.9666 8.78224 14.9043 8.69139C14.842 8.60054 14.7536 8.5307 14.6508 8.49105L11.7973 7.39351C11.3713 7.22986 11.2485 7.17804 11.1493 7.10767C11.0501 7.03693 10.9634 6.95009 10.8929 6.85074C10.822 6.75146 10.7707 6.62872 10.6065 6.20269L9.50895 3.34919Z"
      fill="currentColor"
    />
  </svg>
);

export const MoreHorizontalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M2 6.66699C2.92037 6.66699 3.66682 7.41268 3.66699 8.33301C3.66699 9.25348 2.92047 10 2 10C1.07953 10 0.333008 9.25348 0.333008 8.33301C0.333184 7.41268 1.07963 6.66699 2 6.66699ZM8 6.66699C8.92037 6.66699 9.66682 7.41268 9.66699 8.33301C9.66699 9.25348 8.92047 10 8 10C7.07953 10 6.33301 9.25348 6.33301 8.33301C6.33318 7.41268 7.07963 6.66699 8 6.66699ZM14 6.66699C14.9204 6.66699 15.6668 7.41268 15.667 8.33301C15.667 9.25348 14.9205 10 14 10C13.0795 10 12.333 9.25348 12.333 8.33301C12.3332 7.41268 13.0796 6.66699 14 6.66699Z"
      fill="currentColor"
    />
  </svg>
);

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.65024 3.3054C7.89561 3.04367 8.30727 3.03007 8.56918 3.27512C8.83097 3.52055 8.84466 3.93216 8.59946 4.19407L5.47446 7.52805C5.35158 7.65911 5.1795 7.73313 4.99985 7.73313C4.82025 7.73309 4.64808 7.65908 4.52524 7.52805L1.40024 4.19407C1.15518 3.93216 1.16878 3.5205 1.43051 3.27512C1.69237 3.02996 2.10402 3.04376 2.34946 3.3054L4.99985 6.13157L7.65024 3.3054Z"
      fill="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M2 5.86675C2 4.74664 2 4.18659 2.21799 3.75877C2.40973 3.38244 2.71569 3.07648 3.09202 2.88474C3.51984 2.66675 4.0799 2.66675 5.2 2.66675H10.8C11.9201 2.66675 12.4802 2.66675 12.908 2.88474C13.2843 3.07648 13.5903 3.38244 13.782 3.75877C14 4.18659 14 4.74664 14 5.86675V6.66675H2V5.86675Z"
      fill="currentColor"
    />
    <path
      d="M14 6.66658H2M10.6667 1.33325V3.99992M5.33333 1.33325V3.99992M5.2 14.6666H10.8C11.9201 14.6666 12.4802 14.6666 12.908 14.4486C13.2843 14.2569 13.5903 13.9509 13.782 13.5746C14 13.1467 14 12.5867 14 11.4666V5.86659C14 4.74648 14 4.18643 13.782 3.7586C13.5903 3.38228 13.2843 3.07632 12.908 2.88457C12.4802 2.66659 11.9201 2.66659 10.8 2.66659H5.2C4.0799 2.66659 3.51984 2.66659 3.09202 2.88457C2.71569 3.07632 2.40973 3.38228 2.21799 3.7586C2 4.18643 2 4.74648 2 5.86658V11.4666C2 12.5867 2 13.1467 2.21799 13.5746C2.40973 13.9509 2.71569 14.2569 3.09202 14.4486C3.51984 14.6666 4.0799 14.6666 5.2 14.6666Z"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClockRewindIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
      fill="currentColor"
    />
    <path
      d="M15.1333 9L13.8004 7.66667L12.4666 9M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C10.2013 2 12.1257 3.18542 13.1697 4.95273M8 4.66667V8L10 9.33333"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClockFastForwardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
      fill="currentColor"
    />
    <path
      d="M22.7 11.5L20.7005 13.5L18.7 11.5M20.9451 13C20.9814 12.6717 21 12.338 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C14.8273 21 17.35 19.6963 19 17.6573M12 7V12L15 14"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AlphabeticalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M13 3V9"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11 7L13 9L15 7" stroke="currentColor" strokeLinecap="round" />
    <path
      d="M3.6 8.50203L8.4 8.50203M2 12L5.41736 3.78174C5.60246 3.33661 5.69501 3.11405 5.82326 3.045C5.93469 2.985 6.06531 2.985 6.17674 3.045C6.30499 3.11405 6.39754 3.33661 6.58263 3.78174L10 12"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_23979_5673)">
      <path
        opacity="0.12"
        d="M6 8.13333C6 7.3866 6 7.01323 6.14532 6.72801C6.27316 6.47713 6.47713 6.27316 6.72801 6.14532C7.01323 6 7.3866 6 8.13333 6H12.5333C13.2801 6 13.6534 6 13.9387 6.14532C14.1895 6.27316 14.3935 6.47713 14.5213 6.72801C14.6667 7.01323 14.6667 7.3866 14.6667 8.13333V12.5333C14.6667 13.2801 14.6667 13.6534 14.5213 13.9387C14.3935 14.1895 14.1895 14.3935 13.9387 14.5213C13.6534 14.6667 13.2801 14.6667 12.5333 14.6667H8.13333C7.3866 14.6667 7.01323 14.6667 6.72801 14.5213C6.47713 14.3935 6.27316 14.1895 6.14532 13.9387C6 13.6534 6 13.2801 6 12.5333V8.13333Z"
        fill="var(--sidebar-icon-stroke)"
      />
      <path
        d="M3.33325 9.99992C2.712 9.99992 2.40137 9.99992 2.15634 9.89842C1.82964 9.7631 1.57007 9.50353 1.43475 9.17683C1.33325 8.9318 1.33325 8.62117 1.33325 7.99992V3.46659C1.33325 2.71985 1.33325 2.34648 1.47858 2.06126C1.60641 1.81038 1.81038 1.60641 2.06126 1.47858C2.34648 1.33325 2.71985 1.33325 3.46659 1.33325H7.99992C8.62117 1.33325 8.9318 1.33325 9.17683 1.43475C9.50353 1.57007 9.7631 1.82964 9.89842 2.15634C9.99992 2.40137 9.99992 2.712 9.99992 3.33325M8.13325 14.6666H12.5333C13.28 14.6666 13.6534 14.6666 13.9386 14.5213C14.1895 14.3934 14.3934 14.1895 14.5213 13.9386C14.6666 13.6534 14.6666 13.28 14.6666 12.5333V8.13325C14.6666 7.38651 14.6666 7.01315 14.5213 6.72793C14.3934 6.47705 14.1895 6.27307 13.9386 6.14524C13.6534 5.99992 13.28 5.99992 12.5333 5.99992H8.13325C7.38651 5.99992 7.01315 5.99992 6.72793 6.14524C6.47705 6.27307 6.27307 6.47705 6.14524 6.72793C5.99992 7.01315 5.99992 7.38651 5.99992 8.13325V12.5333C5.99992 13.28 5.99992 13.6534 6.14524 13.9386C6.27307 14.1895 6.47705 14.3934 6.72793 14.5213C7.01315 14.6666 7.38651 14.6666 8.13325 14.6666Z"
        stroke="var(--sidebar-icon-stroke)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_23979_5673">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 5V19M5 12H19"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Pencil2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M6.68014 20.7235C6.98548 20.6402 7.13815 20.5986 7.28052 20.5347C7.40692 20.4779 7.52709 20.4082 7.63908 20.3266C7.76521 20.2347 7.87711 20.1228 8.1009 19.899L18.4343 9.56561C18.6323 9.3676 18.7313 9.2686 18.7684 9.15443C18.8011 9.05401 18.8011 8.94584 18.7684 8.84542C18.7313 8.73125 18.6323 8.63225 18.4343 8.43424L15.5657 5.56561C15.3677 5.3676 15.2687 5.2686 15.1545 5.2315C15.0541 5.19887 14.9459 5.19887 14.8455 5.2315C14.7313 5.2686 14.6323 5.3676 14.4343 5.56561L4.1009 15.899C3.87711 16.1228 3.76521 16.2347 3.67332 16.3608C3.59172 16.4728 3.52199 16.593 3.46523 16.7194C3.40131 16.8618 3.35968 17.0144 3.2764 17.3198L2 21.9999L6.68014 20.7235Z"
      fill="currentColor"
    />
    <path
      d="M18 2L22 6M2 22L3.2764 17.3199C3.35968 17.0145 3.40131 16.8619 3.46523 16.7195C3.52199 16.5931 3.59172 16.4729 3.67332 16.3609C3.76521 16.2348 3.87711 16.1229 4.1009 15.8991L14.4343 5.56569C14.6323 5.36768 14.7313 5.26867 14.8455 5.23158C14.9459 5.19895 15.0541 5.19895 15.1545 5.23158C15.2687 5.26867 15.3677 5.36768 15.5657 5.56569L18.4343 8.43431C18.6323 8.63232 18.7313 8.73133 18.7684 8.84549C18.8011 8.94591 18.8011 9.05409 18.7684 9.15451C18.7313 9.26867 18.6323 9.36768 18.4343 9.56569L8.1009 19.8991C7.87711 20.1229 7.76521 20.2348 7.63908 20.3267C7.52709 20.4083 7.40692 20.478 7.28052 20.5348C7.13815 20.5987 6.98548 20.6403 6.68014 20.7236L2 22Z"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M19 17.2V6H5V17.2C5 18.8802 5 19.7202 5.32698 20.362C5.6146 20.9265 6.07354 21.3854 6.63803 21.673C7.27976 22 8.11984 22 9.8 22H14.2C15.8802 22 16.7202 22 17.362 21.673C17.9265 21.3854 18.3854 20.9265 18.673 20.362C19 19.7202 19 18.8802 19 17.2Z"
      fill="currentColor"
    />
    <path
      d="M16 6V5.2C16 4.0799 16 3.51984 15.782 3.09202C15.5903 2.71569 15.2843 2.40973 14.908 2.21799C14.4802 2 13.9201 2 12.8 2H11.2C10.0799 2 9.51984 2 9.09202 2.21799C8.71569 2.40973 8.40973 2.71569 8.21799 3.09202C8 3.51984 8 4.0799 8 5.2V6M10 11.5V16.5M14 11.5V16.5M3 6H21M19 6V17.2C19 18.8802 19 19.7202 18.673 20.362C18.3854 20.9265 17.9265 21.3854 17.362 21.673C16.7202 22 15.8802 22 14.2 22H9.8C8.11984 22 7.27976 22 6.63803 21.673C6.07354 21.3854 5.6146 20.9265 5.32698 20.362C5 19.7202 5 18.8802 5 17.2V6"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M9 12C9 13.6568 10.3431 15 12 15C12.8284 15 13.5784 14.6642 14.1213 14.1213L9.87868 9.87866C9.33579 10.4216 9 11.1716 9 12Z"
      fill="currentColor"
    />
    <path
      d="M10.7425 5.09232C11.1489 5.03223 11.5682 5 12 5C17.105 5 20.4549 9.50484 21.5803 11.2868C21.7165 11.5025 21.7846 11.6103 21.8227 11.7767C21.8513 11.9016 21.8513 12.0987 21.8227 12.2236C21.7845 12.3899 21.7159 12.4985 21.5788 12.7156C21.2789 13.1901 20.8217 13.8571 20.2161 14.5805M6.72389 6.71504C4.56182 8.1817 3.09402 10.2194 2.42068 11.2853C2.28386 11.5019 2.21545 11.6102 2.17731 11.7765C2.14867 11.9014 2.14866 12.0984 2.17729 12.2234C2.2154 12.3897 2.2835 12.4975 2.41971 12.7132C3.54511 14.4952 6.89499 19 12 19C14.0584 19 15.8315 18.2676 17.2884 17.2766M2.99999 3L21 21M9.87867 9.87868C9.33577 10.4216 8.99999 11.1716 8.99999 12C8.99999 13.6569 10.3431 15 12 15C12.8284 15 13.5784 14.6642 14.1213 14.1213"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CircleUserIcon = (_props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.12">
      <path
        d="M14.0129 14.5788C12.6845 15.7732 10.9271 16.5 9.00008 16.5C7.07302 16.5 5.31571 15.7732 3.9873 14.5788C4.44355 13.5039 5.50877 12.75 6.75008 12.75H11.2501C12.4914 12.75 13.5566 13.5039 14.0129 14.5788Z"
        fill="var(--sidebar-icon-stroke)"
      />
      <path
        d="M9 11.125C10.6569 11.125 12 9.78185 12 8.125C12 6.46815 10.6569 5.125 9 5.125C7.34315 5.125 6 6.46815 6 8.125C6 9.78185 7.34315 11.125 9 11.125Z"
        fill="var(--sidebar-icon-stroke)"
      />
    </g>
    <path
      d="M3.98722 14.5788C4.44347 13.5039 5.50869 12.75 6.75 12.75C8.80557 13.5686 9.75846 13.5075 11.25 12.75C12.4913 12.75 13.5565 13.5039 14.0128 14.5788M12 8.125C12 9.78185 10.6569 11.125 9 11.125C7.34315 11.125 6 9.78185 6 8.125C6 6.46815 7.34315 5.125 9 5.125C10.6569 5.125 12 6.46815 12 8.125ZM16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g opacity="0.12">
      <path
        d="M9.49996 12C11.9852 12 14 9.98528 14 7.5C14 5.01472 11.9852 3 9.49996 3C7.01468 3 4.99996 5.01472 4.99996 7.5C4.99996 9.98528 7.01468 12 9.49996 12Z"
        fill="var(--sidebar-icon-stroke)"
      />
      <path
        d="M9.49996 15C6.66933 15 4.1535 16.5446 2.55919 18.9383C2.20992 19.4628 2.03529 19.725 2.05539 20.0599C2.07105 20.3207 2.24201 20.64 2.4504 20.7976C2.71804 21 3.08613 21 3.82232 21H15.1776C15.9138 21 16.2819 21 16.5495 20.7976C16.7579 20.64 16.9289 20.3207 16.9445 20.0599C16.9646 19.725 16.79 19.4628 16.4407 18.9383C14.8464 16.5446 12.3306 15 9.49996 15Z"
        fill="var(--sidebar-icon-stroke)"
      />
    </g>
    <path
      d="M18 15.8369C19.4559 16.5683 20.7041 17.742 21.6152 19.2096C21.7956 19.5003 21.8858 19.6456 21.917 19.8468C21.9804 20.2558 21.7008 20.7585 21.3199 20.9204C21.1325 21 20.9216 21 20.5 21M16 11.5322C17.4817 10.7959 18.5 9.26686 18.5 7.5C18.5 5.73314 17.4817 4.20411 16 3.46776M14 7.5C14 9.98528 11.9852 12 9.49996 12C7.01468 12 4.99996 9.98528 4.99996 7.5C4.99996 5.01472 7.01468 3 9.49996 3C11.9852 3 14 5.01472 14 7.5ZM2.55919 18.9383C4.1535 16.5446 6.66933 15 9.49996 15C12.3306 15 14.8464 16.5446 16.4407 18.9383C16.79 19.4628 16.9646 19.725 16.9445 20.0599C16.9289 20.3207 16.7579 20.64 16.5495 20.7976C16.2819 21 15.9138 21 15.1776 21H3.82232C3.08613 21 2.71804 21 2.4504 20.7976C2.24201 20.64 2.07105 20.3207 2.05539 20.0599C2.03529 19.725 2.20992 19.4628 2.55919 18.9383Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M8 0.5L9.50897 4.42331C9.72048 4.97324 9.82623 5.2482 9.99069 5.47948C10.1364 5.68447 10.3155 5.86356 10.5205 6.00931C10.7518 6.17377 11.0268 6.27952 11.5767 6.49103L15.5 8L11.5767 9.50897C11.0268 9.72048 10.7518 9.82623 10.5205 9.99069C10.3155 10.1364 10.1364 10.3155 9.99069 10.5205C9.82623 10.7518 9.72048 11.0268 9.50897 11.5767L8 15.5L6.49103 11.5767C6.27952 11.0268 6.17377 10.7518 6.00931 10.5205C5.86356 10.3155 5.68447 10.1364 5.47948 9.99069C5.2482 9.82623 4.97324 9.72048 4.42331 9.50897L0.5 8L4.42331 6.49103C4.97324 6.27952 5.2482 6.17377 5.47948 6.00931C5.68446 5.86356 5.86356 5.68446 6.00931 5.47948C6.17377 5.2482 6.27952 4.97324 6.49103 4.42331L8 0.5Z"
      fill="var(--sidebar-icon-stroke)"
    />
    <path
      d="M8 0.5L9.50897 4.42331C9.72048 4.97324 9.82623 5.2482 9.99069 5.47948C10.1364 5.68447 10.3155 5.86356 10.5205 6.00931C10.7518 6.17377 11.0268 6.27952 11.5767 6.49103L15.5 8L11.5767 9.50897C11.0268 9.72048 10.7518 9.82623 10.5205 9.99069C10.3155 10.1364 10.1364 10.3155 9.99069 10.5205C9.82623 10.7518 9.72048 11.0268 9.50897 11.5767L8 15.5L6.49103 11.5767C6.27952 11.0268 6.17377 10.7518 6.00931 10.5205C5.86356 10.3155 5.68447 10.1364 5.47948 9.99069C5.2482 9.82623 4.97324 9.72048 4.42331 9.50897L0.5 8L4.42331 6.49103C4.97324 6.27952 5.2482 6.17377 5.47948 6.00931C5.68446 5.86356 5.86356 5.68446 6.00931 5.47948C6.17377 5.2482 6.27952 4.97324 6.49103 4.42331L8 0.5Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M8.92195 16.5C13.0639 16.5431 16.4565 13.2204 16.4995 9.07846C16.5426 4.93655 13.2199 1.54394 9.07796 1.50086C4.93605 1.45778 1.54344 4.78053 1.50036 8.92245C1.45728 13.0644 4.78003 16.457 8.92195 16.5Z"
      fill="#212121"
    />
    <path
      d="M6 9L9 12M9 12L12 9M9 12V6M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MailIcon = (_props: React.SVGProps<SVGSVGElement>) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      opacity="0.12"
      d="M12.6821 11.6561C12.076 12.0804 11.773 12.2925 11.4433 12.3747C11.1522 12.4473 10.8477 12.4473 10.5565 12.3747C10.2269 12.2925 9.92383 12.0804 9.31776 11.6561L1.83325 6.41699C1.83325 4.89821 3.06447 3.66699 4.58325 3.66699H17.4166C18.9354 3.66699 20.1666 4.89821 20.1666 6.41699L12.6821 11.6561Z"
      fill="#212121"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.83325 6.41699L9.31776 11.6561C9.92383 12.0804 10.2269 12.2925 10.5565 12.3747C10.8477 12.4473 11.1522 12.4473 11.4433 12.3747C11.773 12.2925 12.076 12.0804 12.6821 11.6561L20.1666 6.41699M6.23325 18.3337H15.7666C17.3067 18.3337 18.0768 18.3337 18.6651 18.0339C19.1825 17.7703 19.6032 17.3496 19.8669 16.8321C20.1666 16.2439 20.1666 15.4738 20.1666 13.9337V8.06699C20.1666 6.52685 20.1666 5.75678 19.8669 5.16852C19.6032 4.65107 19.1825 4.23038 18.6651 3.96672C18.0768 3.66699 17.3067 3.66699 15.7666 3.66699H6.23325C4.69311 3.66699 3.92304 3.66699 3.33478 3.96672C2.81733 4.23038 2.39664 4.65107 2.13298 5.16852C1.83325 5.75678 1.83325 6.52685 1.83325 8.06699V13.9337C1.83325 15.4738 1.83325 16.2439 2.13298 16.8321C2.39664 17.3496 2.81733 17.7703 3.33478 18.0339C3.92304 18.3337 4.69311 18.3337 6.23325 18.3337Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TeleVisionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.52075 6.1875C2.52075 4.66872 3.75197 3.4375 5.27075 3.4375H16.7291C18.2479 3.4375 19.4791 4.66872 19.4791 6.1875V12.1458C19.4791 13.6647 18.2479 14.8958 16.7291 14.8958H5.27075C3.75197 14.8958 2.52075 13.6647 2.52075 12.1458V6.1875Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 18.5622C14.7712 17.9675 12.922 17.6455 11 17.6455C9.07806 17.6455 7.22884 17.9675 5.5 18.5622"
      stroke="var(--sidebar-icon-stroke)"
      strokeWidth="1.125"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronsLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 17L13 12L18 7M11 17L6 12L11 7"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ============================================================================
// Common Icons (app UI: routes, sidebar, settings, form-builder, etc.)
// ============================================================================

const createConsistentLucideIcon = (Icon: React.ComponentType<LucideProps>) => {
  // eslint-disable-next-line eslint-plugin-unicorn/consistent-function-scoping -- Icon is captured via JSX
  const ConsistentLucideIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <Icon strokeWidth={1.5} absoluteStrokeWidth {...props} />
  );
  ConsistentLucideIcon.displayName = Icon.displayName || Icon.name || "ConsistentLucideIcon";
  return ConsistentLucideIcon;
};

export const BanIcon = createConsistentLucideIcon(LucideBan);
export const BluetoothIcon = createConsistentLucideIcon(LucideBluetooth);
export const CheckIcon = createConsistentLucideIcon(LucideCheck);
export const CheckCircle2Icon = createConsistentLucideIcon(LucideCheckCircle2);
export const ChevronLeftIcon = createConsistentLucideIcon(LucideChevronLeft);
export const ChevronRightIcon = createConsistentLucideIcon(LucideChevronRight);
export const ChevronUpIcon = createConsistentLucideIcon(LucideChevronUp);
export const ChevronsRightIcon = createConsistentLucideIcon(LucideChevronsRight);
export const CircleCheckIcon = createConsistentLucideIcon(LucideCircleCheck);
export const CirclePlusIcon = createConsistentLucideIcon(LucideCirclePlus);
export const CircleUserRoundIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      fill="var(--sidebar-icon-stroke)"
    />
    <path
      d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M15 9H15.01M9 9H9.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15.5 9C15.5 9.27614 15.2761 9.5 15 9.5C14.7239 9.5 14.5 9.27614 14.5 9C14.5 8.72386 14.7239 8.5 15 8.5C15.2761 8.5 15.5 8.72386 15.5 9ZM9.5 9C9.5 9.27614 9.27614 9.5 9 9.5C8.72386 9.5 8.5 9.27614 8.5 9C8.5 8.72386 8.72386 8.5 9 8.5C9.27614 8.5 9.5 8.72386 9.5 9Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const CircleXIcon = createConsistentLucideIcon(LucideCircleX);
export const ClockIcon = createConsistentLucideIcon(LucideClock);
export const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M2 8.2V10H22V8.2C22 7.0799 22 6.51984 21.782 6.09202C21.5903 5.7157 21.2843 5.40974 20.908 5.21799C20.4802 5 19.9201 5 18.8 5H5.2C4.0799 5 3.51984 5 3.09202 5.21799C2.7157 5.40973 2.40973 5.71569 2.21799 6.09202C2 6.51984 2 7.07989 2 8.2Z"
      fill="var(--sidebar-icon-stroke)"
    />
    <path
      d="M22 10H2M11 14H6M2 8.2L2 15.8C2 16.9201 2 17.4802 2.21799 17.908C2.40973 18.2843 2.71569 18.5903 3.09202 18.782C3.51984 19 4.07989 19 5.2 19L18.8 19C19.9201 19 20.4802 19 20.908 18.782C21.2843 18.5903 21.5903 18.2843 21.782 17.908C22 17.4802 22 16.9201 22 15.8V8.2C22 7.0799 22 6.51984 21.782 6.09202C21.5903 5.7157 21.2843 5.40974 20.908 5.21799C20.4802 5 19.9201 5 18.8 5L5.2 5C4.0799 5 3.51984 5 3.09202 5.21799C2.7157 5.40973 2.40973 5.71569 2.21799 6.09202C2 6.51984 2 7.07989 2 8.2Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const EyeIcon = createConsistentLucideIcon(LucideEye);
export const EyeOffLucideIcon = createConsistentLucideIcon(LucideEyeOff);
export const FileCodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M14 18.6C14 18.0399 14 17.7599 14.109 17.546C14.2049 17.3578 14.3578 17.2049 14.546 17.109C14.7599 17 15.0399 17 15.6 17H19.4C19.9601 17 20.2401 17 20.454 17.109C20.6422 17.2049 20.7951 17.3578 20.891 17.546C21 17.7599 21 18.0399 21 18.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H15.6C15.0399 21 14.7599 21 14.546 20.891C14.3578 20.7951 14.2049 20.6422 14.109 20.454C14 20.2401 14 19.9601 14 19.4V18.6Z"
      fill="var(--sidebar-icon-stroke)"
    />
    <path
      d="M20 10V6.8C20 5.11984 20 4.27976 19.673 3.63803C19.3854 3.07354 18.9265 2.6146 18.362 2.32698C17.7202 2 16.8802 2 15.2 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H10.5M13 11H8M11 15H8M16 7H8M19.25 17V15.25C19.25 14.2835 18.4665 13.5 17.5 13.5C16.5335 13.5 15.75 14.2835 15.75 15.25V17M15.6 21H19.4C19.9601 21 20.2401 21 20.454 20.891C20.6422 20.7951 20.7951 20.6422 20.891 20.454C21 20.2401 21 19.9601 21 19.4V18.6C21 18.0399 21 17.7599 20.891 17.546C20.7951 17.3578 20.6422 17.2049 20.454 17.109C20.2401 17 19.9601 17 19.4 17H15.6C15.0399 17 14.7599 17 14.546 17.109C14.3578 17.2049 14.2049 17.3578 14.109 17.546C14 17.7599 14 18.0399 14 18.6V19.4C14 19.9601 14 20.2401 14.109 20.454C14.2049 20.6422 14.3578 20.7951 14.546 20.891C14.7599 21 15.0399 21 15.6 21Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const FileIcon = createConsistentLucideIcon(LucideFile);
export const FileQuestionIcon = createConsistentLucideIcon(LucideFileQuestion);
export const FileTextIcon = createConsistentLucideIcon(LucideFileText);
export const FilterIcon = createConsistentLucideIcon(LucideFilter);
export const FolderIcon = createConsistentLucideIcon(LucideFolder);
export const FolderOpenIcon = createConsistentLucideIcon(LucideFolderOpen);
export const FolderSearchIcon = createConsistentLucideIcon(LucideFolderSearch);
export const HelpCircleIcon = createConsistentLucideIcon(LucideHelpCircle);
export const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g opacity="0.12">
      <path
        d="M5.66675 7.00016C6.40313 7.00016 7.00008 6.40321 7.00008 5.66683C7.00008 4.93045 6.40313 4.3335 5.66675 4.3335C4.93037 4.3335 4.33341 4.93045 4.33341 5.66683C4.33341 6.40321 4.93037 7.00016 5.66675 7.00016Z"
        fill="var(--sidebar-icon-stroke)"
      />
      <path
        d="M14.2702 10.2703C13.3416 12.8346 10.8848 14.6668 8.00003 14.6668C6.4991 14.6668 5.11402 14.1708 3.99976 13.3338L9.91245 7.42108C10.1765 7.15707 10.3085 7.02506 10.4607 6.9756C10.5946 6.9321 10.7388 6.9321 10.8727 6.9756C11.0249 7.02506 11.1569 7.15707 11.4209 7.42108L14.2702 10.2703Z"
        fill="var(--sidebar-icon-stroke)"
      />
    </g>
    <path
      d="M3.99964 13.3338L9.91234 7.42108C10.1763 7.15707 10.3084 7.02506 10.4606 6.9756C10.5945 6.9321 10.7387 6.9321 10.8726 6.9756C11.0248 7.02506 11.1568 7.15707 11.4208 7.42108L14.2701 10.2703M6.99992 5.66683C6.99992 6.40321 6.40297 7.00016 5.66659 7.00016C4.93021 7.00016 4.33325 6.40321 4.33325 5.66683C4.33325 4.93045 4.93021 4.3335 5.66659 4.3335C6.40297 4.3335 6.99992 4.93045 6.99992 5.66683ZM14.6666 8.00016C14.6666 11.6821 11.6818 14.6668 7.99992 14.6668C4.31802 14.6668 1.33325 11.6821 1.33325 8.00016C1.33325 4.31826 4.31802 1.3335 7.99992 1.3335C11.6818 1.3335 14.6666 4.31826 14.6666 8.00016Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeLinecap="round"
      strokeWidth="var(--stroke-width)"
      strokeLinejoin="round"
    />
  </svg>
);
export const InfoIcon = createConsistentLucideIcon(LucideInfo);
export const KeyboardIcon = createConsistentLucideIcon(LucideKeyboard);
export const LanguagesIcon = createConsistentLucideIcon(LucideLanguages);
export const LayoutIcon = createConsistentLucideIcon(LucideLayout);
export const Loader2Icon = createConsistentLucideIcon(LucideLoader2);
export const LockIcon = createConsistentLucideIcon(LucideLock);
export const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M21 16.2V7.8C21 6.11985 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H15V21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2Z"
      fill="currentColor"
    />
    <path
      d="M15 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11985 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H15M10 7L15 12M15 12L10 17M15 12L3 12"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const MinusIcon = createConsistentLucideIcon(LucideMinus);
export const MonitorIcon = createConsistentLucideIcon(LucideMonitor);
export const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M22 15.8442C20.6866 16.4382 19.2286 16.7688 17.6935 16.7688C11.9153 16.7688 7.23116 12.0847 7.23116 6.30654C7.23116 4.77135 7.5618 3.3134 8.15577 2C4.52576 3.64163 2 7.2947 2 11.5377C2 17.3159 6.68414 22 12.4623 22C16.7053 22 20.3584 19.4742 22 15.8442Z"
      fill="currentColor"
    />
    <path
      d="M22 15.8442C20.6866 16.4382 19.2286 16.7688 17.6935 16.7688C11.9153 16.7688 7.23116 12.0847 7.23116 6.30654C7.23116 4.77135 7.5618 3.3134 8.15577 2C4.52576 3.64163 2 7.2947 2 11.5377C2 17.3159 6.68414 22 12.4623 22C16.7053 22 20.3584 19.4742 22 15.8442Z"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const MoreVerticalIcon = createConsistentLucideIcon(LucideMoreVertical);
export const OctagonXIcon = createConsistentLucideIcon(LucideOctagonX);
export const PaletteIcon = createConsistentLucideIcon(LucidePalette);
export const PanelLeftIcon = createConsistentLucideIcon(LucidePanelLeft);
export const PencilIcon = createConsistentLucideIcon(LucidePencil);
export const RefreshCwIcon = createConsistentLucideIcon(LucideRefreshCw);
export const RocketIcon = createConsistentLucideIcon(LucideRocket);
export const RotateCcwIcon = createConsistentLucideIcon(LucideRotateCcw);
export const SaveIcon = createConsistentLucideIcon(LucideSave);
export const ShieldIcon = createConsistentLucideIcon(LucideShield);
export const SmileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      opacity="0.12"
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      fill="currentColor"
    />
    <path
      d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M15 9H15.01M9 9H9.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15.5 9C15.5 9.27614 15.2761 9.5 15 9.5C14.7239 9.5 14.5 9.27614 14.5 9C14.5 8.72386 14.7239 8.5 15 8.5C15.2761 8.5 15.5 8.72386 15.5 9ZM9.5 9C9.5 9.27614 9.27614 9.5 9 9.5C8.72386 9.5 8.5 9.27614 8.5 9C8.5 8.72386 8.72386 8.5 9 8.5C9.27614 8.5 9.5 8.72386 9.5 9Z"
      stroke="currentColor"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M11 1V3M11 19V21M3 11H1M5.31412 5.31412L3.8999 3.8999M16.6859 5.31412L18.1001 3.8999M5.31412 16.69L3.8999 18.1042M16.6859 16.69L18.1001 18.1042M21 11H19M16 11C16 13.7614 13.7614 16 11 16C8.23858 16 6 13.7614 6 11C6 8.23858 8.23858 6 11 6C13.7614 6 16 8.23858 16 11Z"
      stroke="var(--sidebar-icon-stroke)"
      strokeWidth="var(--stroke-width)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const TagIcon = createConsistentLucideIcon(LucideTag);
export const Trash2Icon = createConsistentLucideIcon(LucideTrash2);
export const TriangleAlertIcon = createConsistentLucideIcon(LucideTriangleAlert);
export const UploadIcon = createConsistentLucideIcon(LucideUpload);
export const UserIcon = createConsistentLucideIcon(LucideUser);
export const XIcon = createConsistentLucideIcon(LucideX);

// ============================================================================
// Plate.js Editor Icons (toolbar buttons, editor nodes, block menus, etc.)
// ============================================================================

export const AlignCenterIcon = createConsistentLucideIcon(LucideAlignCenter);
export const AlignLeftIcon = createConsistentLucideIcon(LucideAlignLeft);
export const AlignRightIcon = createConsistentLucideIcon(LucideAlignRight);
export const ArrowDownToLineIcon = createConsistentLucideIcon(LucideArrowDownToLine);
export const ArrowLeftIcon = createConsistentLucideIcon(LucideArrowLeft);
export const ArrowRightIcon = createConsistentLucideIcon(LucideArrowRight);
export const ArrowUpToLineIcon = createConsistentLucideIcon(LucideArrowUpToLine);
export const AudioLinesIcon = createConsistentLucideIcon(LucideAudioLines);
export const BoldIcon = createConsistentLucideIcon(LucideBold);
export const BracesIcon = createConsistentLucideIcon(LucideBraces);
export const CornerDownLeftIcon = createConsistentLucideIcon(LucideCornerDownLeft);
export const CropIcon = createConsistentLucideIcon(LucideCrop);
export const EraserIcon = createConsistentLucideIcon(LucideEraser);
export const ExternalLinkIcon = createConsistentLucideIcon(LucideExternalLink);
export const FileUpIcon = createConsistentLucideIcon(LucideFileUp);
export const FilmIcon = createConsistentLucideIcon(LucideFilm);
export const GripHorizontalIcon = createConsistentLucideIcon(LucideGripHorizontal);
export const GripVerticalIcon = createConsistentLucideIcon(LucideGripVertical);
export const IndentIcon = createConsistentLucideIcon(LucideIndent);
export const ItalicIcon = createConsistentLucideIcon(LucideItalic);
export const LinkIcon = createConsistentLucideIcon(LucideLink);
export const ListIcon = createConsistentLucideIcon(LucideList);
export const ListCollapseIcon = createConsistentLucideIcon(LucideListCollapse);
export const ListOrderedIcon = createConsistentLucideIcon(LucideListOrdered);
export const ListTodoIcon = createConsistentLucideIcon(LucideListTodo);
export const MessageSquareTextIcon = createConsistentLucideIcon(LucideMessageSquareText);
export const OutdentIcon = createConsistentLucideIcon(LucideOutdent);
export const PencilLineIcon = createConsistentLucideIcon(LucidePencilLine);
export const PenIcon = createConsistentLucideIcon(LucidePen);
export const RadicalIcon = createConsistentLucideIcon(LucideRadical);
export const Redo2Icon = createConsistentLucideIcon(LucideRedo2);
export const StrikethroughIcon = createConsistentLucideIcon(LucideStrikethrough);
export const TextIcon = createConsistentLucideIcon(LucideText);
export const UnderlineIcon = createConsistentLucideIcon(LucideUnderline);
export const Undo2Icon = createConsistentLucideIcon(LucideUndo2);
export const UnlinkIcon = createConsistentLucideIcon(LucideUnlink);
export const WrapTextIcon = createConsistentLucideIcon(LucideWrapText);
export const AlertCircleIcon = createConsistentLucideIcon(LucideAlertCircle);
export const AtSignIcon = createConsistentLucideIcon(LucideAtSign);
export const HashIcon = createConsistentLucideIcon(LucideHash);
export const PhoneIcon = createConsistentLucideIcon(LucidePhone);
export const SquareCheckIcon = createConsistentLucideIcon(LucideSquareCheck);
export const CheckCheckIcon = createConsistentLucideIcon(LucideCheckCheck);
export const ChevronsUpDownIcon = createConsistentLucideIcon(LucideChevronsUpDown);
