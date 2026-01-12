import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { authClient, getSession } from '@/lib/auth-client';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Mail, ArrowLeft, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAppForm, revalidateLogic } from '@/components/ui/tanstack-form';
import * as z from 'zod';
import { AppHeader } from '@/components/ui/app-header';
import { authMiddleware } from '@/middleware/auth';

const otpSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const Route = createFileRoute('/verify-email')({
    server: {
        middleware: [authMiddleware],
    },
    beforeLoad: async () => {
        const session = await getSession();
        console.log(session, 'from before load')
        if (!session?.data) {
            throw redirect({
                to: '/',
            });
        }
        if (session.data.user.emailVerified) {
            throw redirect({
                to: '/dashboard',
            });
        }
    },
    component: VerifyEmailPage,
});

function VerifyEmailPage() {
    const navigate = useNavigate();
    const { data: session } = authClient.useSession();
    const email = session?.user.email || '';

    const verifyEmailMutation = useMutation({
        mutationFn: async (variables: { email: string; otp: string }) => {
            const { error } = await authClient.emailOtp.verifyEmail({
                email: variables.email,
                otp: variables.otp,
            });
            if (error) {
                toast.error(error.message || 'Verification failed');
                throw error;
            }
        },
        onSuccess: () => {
            toast.success('Email verified successfully!');
            navigate({ to: '/dashboard' });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Verification failed');
        },
    });

    const sendOtpMutation = useMutation({
        mutationFn: async (variables: { email: string }) => {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email: variables.email,
                type: 'email-verification',
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Verification code resent to your email');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to resend code');
        },
    });

    const otpForm = useAppForm({
        defaultValues: {
            otp: '',
        } as z.input<typeof otpSchema>,
        validationLogic: revalidateLogic(),
        validators: { onDynamic: otpSchema, onDynamicAsyncDebounceMs: 500 },
        onSubmit: async ({ value }) => {
            verifyEmailMutation.mutate({
                email,
                otp: value.otp,
            });
        },
    });

    const handleResend = () => {
        sendOtpMutation.mutate({ email });
    };

    const handleSignOut = async () => {
        await authClient.signOut();
        navigate({ to: '/' });
    };

    const isPending = verifyEmailMutation.isPending || sendOtpMutation.isPending;

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <AppHeader />
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                            We've sent a 6-digit verification code to <br />
                            <span className="font-semibold text-foreground">{email}</span>
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
                        <otpForm.AppForm>
                            <otpForm.Form className="space-y-6">
                                <otpForm.AppField name="otp">
                                    {(field) => (
                                        <field.FieldSet className="w-full flex flex-col items-center space-y-4">
                                            <field.Field>
                                                <InputOTP
                                                    maxLength={6}
                                                    value={(field.state.value as string) ?? ''}
                                                    onChange={field.handleChange}
                                                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                                                    disabled={isPending}
                                                >
                                                    <InputOTPGroup>
                                                        <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                                                        <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                                                        <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                                                    </InputOTPGroup>
                                                    <InputOTPSeparator />
                                                    <InputOTPGroup>
                                                        <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                                                        <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                                                        <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </field.Field>
                                            <field.FieldError />
                                        </field.FieldSet>
                                    )}
                                </otpForm.AppField>

                                <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Verify Email'}
                                </Button>
                            </otpForm.Form>
                        </otpForm.AppForm>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Didn't receive a code?</span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleResend}
                            disabled={isPending}
                            className="w-full h-11"
                        >
                            {sendOtpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Resend verification code'}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <button
                            onClick={handleSignOut}
                            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </button>
                        <button
                            onClick={() => navigate({ to: '/' })}
                            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
