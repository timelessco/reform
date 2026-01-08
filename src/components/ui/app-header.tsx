import { Button } from '@/components/ui/button';
import {
    History,
    Settings,
    Flower2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

import { togglePreview } from '@/services/form.service';
import useFormState from '@/hooks/use-form-state';
import { Link } from '@tanstack/react-router';
import { useSearch } from '@tanstack/react-router';

export function AppHeader() {
    const form = useFormState();
    const { demo } = useSearch({ from: '/' })

    return (
        <header className="flex h-12 w-full items-center justify-between border-b bg-background px-4 text-sm font-medium">
            {/* Left Section: Logo & Title */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Flower2 className="h-5 w-5" />
                <span className="text-foreground">{form.title || 'Untitled'}</span>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1">

                {/* Icons */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-2 h-4" />
                <Button variant="ghost" asChild size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                    <Link to="/" search={{ demo: !demo }}>Demo</Link>
                </Button>
                {/* Text Actions */}
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                    Customize
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-normal hover:text-blue-700 hover:bg-blue-50">
                    Sign up
                </Button>
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
            </div>
        </header>
    );
}
