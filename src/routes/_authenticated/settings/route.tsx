import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/settings')({
    component: SettingsLayout,
})

function SettingsLayout() {
    return (
        <div className="flex-1 flex flex-col min-h-screen bg-background">
            {/* Settings Header */}
            <header className="h-12 border-b flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground mr-1">*</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm font-medium">Settings</span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-12 max-w-5xl mx-auto w-full space-y-8">
                <div className="space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight">Settings</h1>

                    {/* Navigation Tabs */}
                    <nav className="flex items-center gap-6 border-b">
                        <Link
                            to="/settings/my-account"
                            className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
                        >
                            My account
                        </Link>
                        <Link
                            to="/settings/notifications"
                            className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
                        >
                            Notifications
                        </Link>
                        <Link
                            to="/settings/api-keys"
                            className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
                        >
                            API keys
                        </Link>
                        <Link
                            to="/settings/billing"
                            className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
                        >
                            Billing
                        </Link>
                    </nav>

                    <div className="pt-4">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
