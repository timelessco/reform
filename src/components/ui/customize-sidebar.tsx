

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCustomizeSidebar } from '@/hooks/use-customize-sidebar';
import { cn } from '@/lib/utils';

export function CustomizeSidebar() {
    const { isOpen, setIsOpen } = useCustomizeSidebar();

    if (!isOpen) return null;

    return (
        <aside className={cn(
            "w-[400px] border-l bg-background flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
            "animate-in slide-in-from-right-full"
        )}>
            <div className="flex items-center justify-between p-4 pb-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Customize</h2>
                    <p className="text-sm text-muted-foreground">
                        Appearance and settings
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    {/* Placeholder sections - to be filled in later */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-medium">Appearance</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border p-4 text-xs text-center text-muted-foreground hover:border-foreground cursor-pointer transition-colors">
                                Light
                            </div>
                            <div className="rounded-lg border p-4 text-xs text-center text-muted-foreground hover:border-foreground cursor-pointer transition-colors bg-neutral-900 border-neutral-800">
                                Dark
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-medium">Theme</h3>
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                            Theme options coming soon...
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-sm font-medium">Layout</h3>
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                            Layout options coming soon...
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </aside>
    );
}
