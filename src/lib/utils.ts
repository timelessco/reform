import { createIsomorphicFn } from "@tanstack/react-start";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const logger = createIsomorphicFn()
	.client((...args: any[]) => {
		if (!import.meta.env.PROD) {
			console.log("[Client Log] :", ...args);
		}
	})
	.server((...args: any[]) => {
		console.log("[Server Log] :", ...args);
	});
