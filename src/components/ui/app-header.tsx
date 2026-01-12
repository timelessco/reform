import { Button } from '@/components/ui/button';
import {
    History,
    Settings,
    Flower2,
    LogOut,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useCustomizeSidebar } from '@/hooks/use-customize-sidebar';
import { AuthDialog } from '@/components/auth';
import { useSession, auth } from '@/lib/auth-client';
import { useMutation } from '@tanstack/react-query';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

import { togglePreview } from '@/services/form.service';
import useFormState from '@/hooks/use-form-state';
import { Link, useSearch, useLocation } from '@tanstack/react-router';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';

export function AppHeader() {
    const form = useFormState();
    const { pathname } = useLocation();
    const isFormBuilder = pathname.startsWith('/form-builder');
    const { data: sessionData } = useSession();
    const session = sessionData;
    const isUnverified = session && !session.user.emailVerified;

    // Get search params for the current route
    const search: any = useSearch({ strict: false });
    const demo = search.demo;
    const { toggle } = useCustomizeSidebar();

    const signOutMutation = useMutation(auth.signOut.mutationOptions({
        onSuccess: () => {
            toast.success('Signed out successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to sign out');
            console.error(error);
        }
    }));

    const handleSignOut = async () => {
        signOutMutation.mutate({});
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="flex h-12 w-full items-center justify-between border-b bg-background px-4 text-sm font-medium shrink-0">
            {/* Left Section: Breadcrumbs */}
            <div className="flex items-center gap-4">
                {isFormBuilder ? (
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link to="/dashboard" className="flex items-center gap-1">
                                        <span className="text-muted-foreground">*</span>
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link to="/dashboard">My workspace</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="flex items-center gap-2">
                                    {form.title || 'Untitled'}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                ) : (
                    <Link to="/" className="flex items-center gap-2">
                        <Flower2 className="h-5 w-5" />
                        <span className="text-foreground">Better Forms</span>
                    </Link>
                )}
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2">
                {isFormBuilder && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground mr-2">
                        Draft
                    </Badge>
                )}

                {isFormBuilder ? (
                    <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                            <Link to="/settings/my-account">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>

                        <Separator orientation="vertical" className="mx-2 h-4" />
                        <Button variant="ghost" asChild size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                            <Link to="." search={{ demo: !demo } as any}>Demo</Link>
                        </Button>
                        {/* Text Actions */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-muted-foreground font-normal hover:text-foreground"
                            onClick={() => toggle()}
                        >
                            Customize
                        </Button>
                        {session ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(session.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-normal hidden sm:inline">
                                            {session.user.name}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{session.user.name}</p>
                                            <p className="text-xs text-muted-foreground">{session.user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                        {isUnverified && (
                                            <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1">
                                                Unverified
                                            </Badge>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/settings/my-account" className="flex items-center gap-2">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <AuthDialog defaultMode="sign-up">
                                <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-normal hover:text-blue-700 hover:bg-blue-50">
                                    Sign up
                                </Button>
                            </AuthDialog>
                        )}
                        <Button
                            variant={form.isPreview ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                                "h-8 font-normal transition-colors",
                                form.isPreview ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => togglePreview(form.id, form.isPreview)}
                        >
                            {form.isPreview ? 'Editing' : 'Preview'}
                        </Button>

                        {/* Primary Action */}
                        <Button size="sm" className="h-8 px-4 bg-blue-600 hover:bg-blue-700 ml-2">
                            Publish
                        </Button>
                    </>
                ) : (
                    <>
                        {session ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(session.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-normal hidden sm:inline">
                                            {session.user.name}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{session.user.name}</p>
                                            <p className="text-xs text-muted-foreground">{session.user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                        {isUnverified && (
                                            <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1">
                                                Unverified
                                            </Badge>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <AuthDialog defaultMode="sign-in">
                                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                                    Sign in
                                </Button>
                            </AuthDialog>
                        )}
                        <Button
                            size="sm"
                            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 ml-2"
                            asChild
                            disabled={!!isUnverified}
                        >
                            <Link to={isUnverified ? "/verify-email" : "/form-builder"}>
                                {isUnverified ? "Verify Email" : "Create Form"}
                            </Link>
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
}
