'use client';

import * as React from 'react';
import {
    BLOCK_CONTEXT_MENU_ID,
    BlockMenuPlugin,
    BlockSelectionPlugin,
} from '@platejs/selection/react';
import {
    ChevronsRight,
    Copy,
    Indent,
    Outdent,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorPlugin, usePluginOption } from 'platejs/react';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';

type BlockMenuState = 'main' | 'turnInto' | 'align' | 'indent' | 'color';

export function BlockMenu({ children }: { children: React.ReactNode }) {
    const { api, editor } = useEditorPlugin(BlockMenuPlugin);
    const openId = usePluginOption(BlockMenuPlugin, 'openId');
    const isOpen = openId === BLOCK_CONTEXT_MENU_ID;

    // Retrieve position from plugin options
    const position = usePluginOption(BlockMenuPlugin, 'position');
    const { x, y } = position ?? { x: 0, y: 0 };

    const [menuState, setMenuState] = React.useState<BlockMenuState>('main');

    // Reset menu state when closed
    React.useEffect(() => {
        if (!isOpen) {
            setMenuState('main');
        }
    }, [isOpen]);

    const handleTurnInto = (type: string) => {
        editor
            .getApi(BlockSelectionPlugin)
            .blockSelection.getNodes()
            .forEach(([node, path]) => {
                if (node[KEYS.listType]) {
                    editor.tf.unsetNodes([KEYS.listType, 'indent'], {
                        at: path,
                    });
                }
                editor.tf.toggleBlock(type, { at: path });
            });
        api.blockMenu.hide();
    };

    const handleIndent = () => {
        editor
            .getTransforms(BlockSelectionPlugin)
            .blockSelection.setIndent(1);
        api.blockMenu.hide();
    };

    const handleOutdent = () => {
        editor
            .getTransforms(BlockSelectionPlugin)
            .blockSelection.setIndent(-1);
        api.blockMenu.hide();
    };

    return (
        <>
            <div
                onContextMenu={(event) => {
                    // Standard Context Menu Trigger
                    // We prevent default to show our custom menu
                    event.preventDefault();
                    api.blockMenu.show(BLOCK_CONTEXT_MENU_ID, {
                        x: event.clientX,
                        y: event.clientY,
                    });
                }}
            >
                {children}
            </div>

            <Popover open={isOpen} onOpenChange={(open) => !open && api.blockMenu.hide()}>
                <PopoverAnchor
                    style={{
                        position: 'fixed',
                        left: `${x}px`,
                        top: `${y}px`,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none',
                    }}
                />
                <PopoverContent className="p-0 w-64" align="start">
                    <Command>
                        <CommandInput placeholder="Search actions..." autoFocus />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>

                            {menuState === 'main' && (
                                <>
                                    <CommandGroup heading="Actions">
                                        <CommandItem
                                            onSelect={() => {
                                                editor
                                                    .getTransforms(BlockSelectionPlugin)
                                                    .blockSelection.removeNodes();
                                                editor.tf.focus();
                                                api.blockMenu.hide();
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                            <CommandShortcut>Del</CommandShortcut>
                                        </CommandItem>
                                        <CommandItem
                                            onSelect={() => {
                                                editor
                                                    .getTransforms(BlockSelectionPlugin)
                                                    .blockSelection.duplicate();
                                                api.blockMenu.hide();
                                            }}
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicate
                                            <CommandShortcut>⌘D</CommandShortcut>
                                        </CommandItem>
                                    </CommandGroup>
                                    <CommandGroup heading="Transform">
                                        <CommandItem onSelect={() => setMenuState('turnInto')}>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Turn into
                                            <ChevronsRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleIndent()}>
                                            <Indent className="mr-2 h-4 w-4" />
                                            Indent
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleOutdent()}>
                                            <Outdent className="mr-2 h-4 w-4" />
                                            Outdent
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}

                            {menuState === 'turnInto' && (
                                <CommandGroup heading="Turn into">
                                    <CommandItem onSelect={() => setMenuState('main')}>
                                        <div className="flex items-center text-muted-foreground">
                                            ← Back
                                        </div>
                                    </CommandItem>
                                    <CommandItem onSelect={() => handleTurnInto(KEYS.p)}>Paragraph</CommandItem>
                                    <CommandItem onSelect={() => handleTurnInto(KEYS.h1)}>Heading 1</CommandItem>
                                    <CommandItem onSelect={() => handleTurnInto(KEYS.h2)}>Heading 2</CommandItem>
                                    <CommandItem onSelect={() => handleTurnInto(KEYS.h3)}>Heading 3</CommandItem>
                                    <CommandItem onSelect={() => handleTurnInto(KEYS.blockquote)}>Blockquote</CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    );
}
