'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    History,
    Settings,
    Play,
    Share,
    Flower2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export function AppHeader() {
    return (
        <header className="flex h-12 w-full items-center justify-between border-b bg-background px-4 text-sm font-medium">
            {/* Left Section: Logo & Title */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Flower2 className="h-5 w-5" />
                <span className="text-foreground">Untitled</span>
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

                {/* Text Actions */}
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                    Customize
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 font-normal hover:text-blue-700 hover:bg-blue-50">
                    Sign up
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-normal hover:text-foreground">
                    Preview
                </Button>

                {/* Primary Action */}
                <Button size="sm" className="h-8 px-4 bg-blue-600 hover:bg-blue-700 ml-2">
                    Publish
                </Button>
            </div>
        </header>
    );
}
