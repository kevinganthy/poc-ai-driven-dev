export interface Ticket {
	id: string;
	title: string;
	description: string;
	status: string;
	authorId: string;
	createdAt: string;
	updatedAt: string;
	category?: {
		id: number;
		name: string;
	} | null;
}
