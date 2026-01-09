import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
    component: NotificationsPage,
})

function NotificationsPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="text-muted-foreground italic">Notification settings coming soon...</p>
        </div>
    )
}
