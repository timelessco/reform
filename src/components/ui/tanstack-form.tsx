import {
	createFormHook,
	createFormHookContexts,
	revalidateLogic,
	useStore,
} from "@tanstack/react-form";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
	Field as DefaultField,
	FieldError as DefaultFieldError,
	FieldSet as DefaultFieldSet,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldTitle,
	type fieldVariants,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const {
	fieldContext,
	formContext,
	useFieldContext: _useFieldContext,
	useFormContext,
} = createFormHookContexts();

const Form = React.forwardRef<
	HTMLFormElement,
	Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit"> & {
		children?: React.ReactNode;
	}
>(({ children, className, ...props }, ref) => {
	const form = useFormContext();
	const handleSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			e.stopPropagation();
			form.handleSubmit();
		},
		[form],
	);
	return (
		<form
			ref={ref}
			onSubmit={handleSubmit}
			className={cn("flex flex-col p-2 md:p-5 w-full mx-auto gap-2", className)}
			noValidate
			{...props}
		>
			{children}
		</form>
	);
});
Form.displayName = "Form";

const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		Field,
		FieldError,
		FieldSet,
		FieldContent,
		FieldDescription,
		FieldGroup,
		FieldLabel,
		FieldLegend,
		FieldSeparator,
		FieldTitle,
		InputGroup,
		InputGroupAddon,
		InputGroupInput,
	},
	formComponents: {
		SubmitButton,
		StepButton,
		FieldLegend,
		FieldDescription,
		FieldSeparator,
		Form,
	},
});

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FieldSet({
	className,
	children,
	...props
}: React.ComponentProps<"fieldset">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<DefaultFieldSet className={cn("grid gap-1", className)} {...props}>
				{children}
			</DefaultFieldSet>
		</FormItemContext.Provider>
	);
}

// Stable selector function to ensure consistent hook calls
const fieldStateSelector = (state: any) => ({
	errors: state?.meta?.errors ?? [],
	isTouched: state?.meta?.isTouched ?? false,
});

const useFieldContext = () => {
	const { id } = React.useContext(FormItemContext);

	// Always call _useFieldContext() unconditionally - it's a hook and must be called
	// This hook may conditionally call hooks internally, but we must always call it
	const fieldContext = _useFieldContext();

	// Use a ref to maintain a stable store reference across renders
	// This ensures useStore is always called with a consistent reference type
	const storeRef = React.useRef<any>(null);

	// Update the ref if we have a store, but always use the ref for useStore
	// This ensures hook order stability even when fieldContext changes
	if (fieldContext?.store !== undefined) {
		storeRef.current = fieldContext.store ?? null;
	}

	// Always call useStore unconditionally to keep hook order stable
	// useStore handles undefined/null store by not subscribing
	const fieldState = useStore(storeRef.current as any, fieldStateSelector);

	if (!fieldContext) {
		throw new Error("useFieldContext should be used within <FormItem>");
	}

	return {
		id,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		errors: fieldState.errors,
		isTouched: fieldState.isTouched,
		...fieldContext,
	};
};

function Field({
	children,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
	const {
		errors,
		isTouched,
		formItemId,
		formDescriptionId,
		formMessageId,
		handleBlur,
	} = useFieldContext();
	const hasVisibleErrors = !!errors.length && isTouched;

	return (
		<DefaultField
			data-invalid={hasVisibleErrors}
			id={formItemId}
			onBlur={handleBlur}
			aria-describedby={
				!hasVisibleErrors
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={hasVisibleErrors}
			{...props}
		>
			{children}
		</DefaultField>
	);
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
	const { errors, isTouched, formMessageId } = useFieldContext();
	const body = errors.length ? String(errors.at(0)?.message ?? "") : "";
	if (!body || !isTouched) return null;
	return (
		<DefaultFieldError
			data-slot="form-message"
			id={formMessageId}
			className={cn("text-destructive text-sm", className)}
			{...props}
			errors={body ? [{ message: body }] : []}
		/>
	);
}

function SubmitButton({
	label,
	className,
	size,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		label: string;
	}) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					className={className}
					size={size}
					type="submit"
					disabled={isSubmitting}
					{...props}
				>
					{isSubmitting && <Spinner />}
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

function StepButton({
	label,
	handleMovement,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		label: React.ReactNode | string;
		handleMovement: () => void;
	}) {
	return (
		<Button
			size="sm"
			variant="ghost"
			type="button"
			onClick={handleMovement}
			{...props}
		>
			{label}
		</Button>
	);
}

export {
	revalidateLogic,
	useAppForm,
	useFieldContext,
	useFormContext,
	withFieldGroup,
	withForm,
};
