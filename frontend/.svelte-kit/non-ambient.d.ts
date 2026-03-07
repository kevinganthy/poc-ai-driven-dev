
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/login" | "/login/__tests__" | "/register" | "/register/__tests__" | "/tickets" | "/tickets/__tests__" | "/tickets/new" | "/tickets/new/__tests__" | "/tickets/[id]" | "/tickets/[id]/edit" | "/tickets/[id]/edit/__tests__";
		RouteParams(): {
			"/tickets/[id]": { id: string };
			"/tickets/[id]/edit": { id: string };
			"/tickets/[id]/edit/__tests__": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/login": Record<string, never>;
			"/login/__tests__": Record<string, never>;
			"/register": Record<string, never>;
			"/register/__tests__": Record<string, never>;
			"/tickets": { id?: string };
			"/tickets/__tests__": Record<string, never>;
			"/tickets/new": Record<string, never>;
			"/tickets/new/__tests__": Record<string, never>;
			"/tickets/[id]": { id: string };
			"/tickets/[id]/edit": { id: string };
			"/tickets/[id]/edit/__tests__": { id: string }
		};
		Pathname(): "/" | "/login" | "/register" | "/tickets" | "/tickets/new" | `/tickets/${string}/edit` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}