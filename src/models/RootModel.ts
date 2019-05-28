import { Model } from ".";
import { GridCardExport } from "../components/MainPage/MainView/cards/BaseGridCard";
import { ModelMeta } from "./Model";

/** Data type for roots/contents object sets */
export type objectSetType = { name?: string; card?: GridCardExport; count?: number; objectIds: number[] };

export default class RootModel extends Model {
	// Typescript hacks
	"constructor": typeof RootModel;
	static meta: ModelMeta<RootModel>;

	/** Metadata for behaviour as a root */
	static rootModelMeta: {
		hasRoots: boolean;
		rootsName?: string;
		rootsCard?: GridCardExport;
		rootsFilterParam?: string;

		contentsName: string;
		contentsCard: GridCardExport;
		contentsFilterParam: string;
		contentsClass: typeof Model;
	};

	/** List of base root objects */
	private static absoluteRoots: number[] = null;

	/**
	 * Retrieve or load base root objects
	 * @returns ObjectSets for roots and empty contents
	 */
	static async getAbsoluteRoots(): Promise<{ roots: objectSetType; contents: objectSetType }> {
		let roots: objectSetType;
		if (this.absoluteRoots === null) {
			const rootsData = await this.loadFiltered({ [this.rootModelMeta.rootsFilterParam]: null });
			roots = { count: rootsData.count, objectIds: rootsData.objects.map(root => root.id) };
			this.absoluteRoots = roots.objectIds;
		} else roots = { count: this.absoluteRoots.length, objectIds: this.absoluteRoots };

		roots.name = this.rootModelMeta.rootsName;
		roots.card = this.rootModelMeta.rootsCard;

		return { roots: roots, contents: { count: 0, objectIds: [], name: this.rootModelMeta.contentsName, card: this.rootModelMeta.contentsCard } };
	}

	/** List of root objects for each search term (`null` key for no search) */
	private roots = new Map<string, number[]>();

	/** List of contents objects for each search term (`null` key for no search) */
	private contents = new Map<string, { count: number; objectIds: number[] }>();

	/**
	 * Retrieve or load child root objects
	 * @param searchQuery Current search query
	 * @returns IDs of root objects found
	 */
	private async getRoots(searchQuery?: string): Promise<objectSetType | null> {
		if (!this.constructor.rootModelMeta.hasRoots) return null;
		searchQuery = searchQuery || null;

		// Get from previously loaded roots
		let existingRootIds = this.roots.get(searchQuery);
		if (existingRootIds !== undefined) return { objectIds: existingRootIds };

		// Load from server
		const rootsData = await this.constructor.loadFiltered({ [this.constructor.rootModelMeta.rootsFilterParam]: this.id, ...(searchQuery ? { search: searchQuery } : {}) });

		// Save to stored roots
		let objectIds = rootsData.objects.map(object => object.id);
		this.roots.set(searchQuery, objectIds);

		return { objectIds: objectIds };
	}

	/**
	 * Retrieve or load contents objects
	 * @param page Current page number
	 * @param pageSize Page size
	 * @param searchQuery Current search query
	 * @returns Total number of results, and IDs from requested page
	 */
	private async getContentObjects(page: number, pageSize: number, searchQuery?: string): Promise<objectSetType> {
		searchQuery = searchQuery || null;

		// Get from previously loaded content
		let existingContents = this.contents.get(searchQuery);
		if (existingContents !== undefined) {
			if (existingContents.count > 0 && (page - 1) * pageSize >= existingContents.count) throw { detail: "Invalid page." };
			let pageIds = existingContents.objectIds.slice((page - 1) * pageSize, page * pageSize);
			if (pageIds.every(id => id !== null)) return { count: existingContents.count, objectIds: pageIds };
		}

		// Load from server
		const contentsData = await this.constructor.rootModelMeta.contentsClass.loadFiltered(
			{ [this.constructor.rootModelMeta.contentsFilterParam]: this.id, ...(searchQuery ? { search: searchQuery } : {}) },
			page,
			pageSize
		);

		// Save to stored content
		let oldIds = existingContents !== undefined ? existingContents.objectIds : new Array(contentsData.count).fill(null);
		let newIds = contentsData.objects.map(object => object.id);
		let allObjectIds = oldIds.slice(0, (page - 1) * pageSize).concat(newIds.concat(oldIds.slice(page * pageSize)));
		this.contents.set(searchQuery, {
			count: contentsData.count,
			objectIds: allObjectIds
		});

		return { count: contentsData.count, objectIds: newIds };
	}

	/**
	 * Get all contents
	 * @param page Current page number
	 * @param pageSize Page size
	 * @param searchQuery Current search query
	 * @returns ObjectSet for roots (may be `null`) and contents
	 */
	async getContents(page: number, pageSize: number, searchQuery?: string): Promise<{ roots: objectSetType | null; contents: objectSetType }> {
		var roots = await this.getRoots(searchQuery);
		if (roots !== null) {
			roots.name = this.constructor.rootModelMeta.rootsName;
			roots.card = this.constructor.rootModelMeta.rootsCard;
		}

		var contents = await this.getContentObjects(page, pageSize, searchQuery);
		contents.name = this.constructor.rootModelMeta.contentsName;
		contents.card = this.constructor.rootModelMeta.contentsCard;

		return { roots: roots, contents: contents };
	}
}
