import { Grid, ListSubheader, Theme, withStyles, withWidth } from "@material-ui/core";
import { Breakpoint } from "@material-ui/core/styles/createBreakpoints";
import { isWidthDown, isWidthUp } from "@material-ui/core/withWidth";
import React, { Fragment } from "react";
import { List, ListRowProps } from "react-virtualized";
import RootModel, { objectSetType } from "../../../../../models/RootModel";
import { LocationManager } from "../../../../utils";
import BaseGridCard, { GridCardExport } from "../../cards/BaseGridCard";
import SelectionManager from "../SelectionManager";
import View, { ViewProps, ViewState } from "../View";
import PaginationDisplay from "./PaginationDisplay";
import ScaleManager from "./ScaleManager";

/** Height of the MUI ListSubheader (used in scaling) */
const listSubHeaderHeight = 48;

/** Data type to store information about GridView rows to be rendered */
interface GridViewRow {
	card: GridCardExport;
	canSelect: boolean;
	scale: number;
	height: number;
	objectIds: number[];
}

/** Data type to store a pre-rendered row (i.e. the top/bottom bars) */
interface StandardRow {
	render: (props: ListRowProps) => JSX.Element;
	height: number;
}

/** Data type for GridView state */
interface GridViewState extends ViewState {
	data: {
		roots: objectSetType | null;
		contents: objectSetType;
	};
}

/** Data type for GridView props */
interface GridViewProps {
	classes: {
		scaleSlider: string;
	};
	width: Breakpoint;
}

/** Base View class for standard Grid-based item (e.g. files, faces) display */
export abstract class GridView extends View<GridViewState, GridViewProps> {
	static styles = (theme: Theme) => ({
		scaleSlider: ScaleManager.sliderStyle(theme)
	});

	/** The Model to use as a root (the container - e.g. Folder, Person, Album) */
	static rootModelClass: typeof RootModel;

	// Hack to access "this.class"
	class: typeof GridView;

	/** Manager for GridCard scaling */
	scaleManager: ScaleManager;

	/** Ref to virtualised List component */
	virtualList: React.RefObject<List>;

	constructor(props: ViewProps & GridViewProps) {
		super(props);

		this.class = this.constructor as typeof GridView;

		this.getData(props);

		this.scaleManager = new ScaleManager(this);
		this.selectionManager = new SelectionManager(this, () => this.state.data.contents.objectIds, () => this.state.data.contents.card.modelType);
		this.virtualList = React.createRef<List>();
	}

	/**
	 * Load data to be displayed, into `this.state` based on `this.props`
	 * @param props Value of `this.props` to use
	 */
	private async getData(props: ViewProps) {
		if (props.rootId === null) {
			// Load base root objects
			const data = await this.class.rootModelClass.getAbsoluteRoots();
			this.setState({ data: data, dataLoaded: true });
		} else {
			// Load children of chosen root object
			const rootObject = await this.class.rootModelClass.loadObject<RootModel>(props.rootId);

			if (this.updateHandler) this.updateHandler.unregister();
			this.updateHandler = rootObject.registerContentsUpdateHandler(
				props.page,
				props.pageSize,
				props.searchQuery,
				data => this.setState({ data: data, dataLoaded: true }),
				error => {
					if ("detail" in error && error.detail === "Invalid page.") LocationManager.updateQuery({ page: "1" });
					else throw error;
				}
			);
		}
	}

	/**
	 * Sort current data into rows, based on scale
	 * @returns List of all rows to render
	 */
	private getRows(): (GridViewRow | string)[] {
		let rows: (GridViewRow | string)[] = [];

		// Function to add rows for a data set
		const addRows = (set: objectSetType | null, select: boolean) => {
			if (set !== null) {
				// Get actual scale for cards in row
				let desiredScale = set.card.getDesiredSize(this.state.currentScale, this.props.width);
				let cardsPerRow = this.scaleManager.getCountFromScale(desiredScale.width);
				let actualWidth = this.scaleManager.getScaleFromCount(cardsPerRow);
				let actualScale = set.card.getDesiredSize(actualWidth, this.props.width);

				if (set.objectIds.length > 0) rows.push(set.name);
				for (let i = 0; i < set.objectIds.length; i += cardsPerRow) {
					rows.push({ card: set.card, canSelect: select, scale: actualScale.width, height: actualScale.height, objectIds: set.objectIds.slice(i, i + cardsPerRow) });
				}
			}
		};

		// Add rows for each data set
		addRows(this.state.data.roots, false);
		addRows(this.state.data.contents, true);

		return rows;
	}

	shouldComponentUpdate(nextProps: ViewProps, nextState: GridViewState) {
		// If scale has changed, recompute grid row heights
		if (nextState.currentScale !== this.state.currentScale) this.scaleManager.recomputeHeight();

		// If the view has changed, load new view
		if (
			nextProps.rootId !== this.props.rootId ||
			nextProps.searchQuery !== this.props.searchQuery ||
			nextProps.page !== this.props.page ||
			nextProps.pageSize !== this.props.pageSize
		) {
			this.resetState();

			// Fetch new data
			this.getData(nextProps);

			return false;
		}

		return true;
	}

	renderContents() {
		const rows: (GridViewRow | string | StandardRow)[] = this.getRows();

		if (isWidthDown("sm", this.props.width)) {
			rows.unshift(
				{
					render: ({ index, style }) => (
						<div key={index} style={style}>
							{this.scaleManager.render(this.props.classes.scaleSlider)}
						</div>
					),
					height: ScaleManager.sliderHeight
				},
				{
					render: ({ index, style }) => (
						<div key={index} style={style}>
							<PaginationDisplay page={this.props.page} pageSize={this.props.pageSize} totalCount={this.state.data.contents.count} />
						</div>
					),
					height: this.state.data.contents.count > this.props.pageSize ? ScaleManager.sliderHeight : 0
				}
			);
		}

		return (
			<Fragment>
				{/* Toolbar */}
				{isWidthUp("md", this.props.width) && (
					<Grid container>
						<Grid item md={3}>
							{/* Scaling slider */}
							{this.scaleManager.render(this.props.classes.scaleSlider)}
						</Grid>
						<Grid item md={9}>
							{/* Pagination links */}
							<PaginationDisplay page={this.props.page} pageSize={this.props.pageSize} totalCount={this.state.data.contents.count} />
						</Grid>
					</Grid>
				)}

				{/* Main virtualised list */}
				<div onClick={() => this.selectionManager.selectAll(false)}>
					<List
						ref={this.virtualList}
						width={this.props.totalWidth}
						height={this.props.totalHeight - (isWidthUp("md", this.props.width) ? ScaleManager.sliderHeight : 0)}
						style={{ paddingLeft: ScaleManager.horizontalPadding }}
						rowCount={rows.length}
						rowHeight={props => {
							let row = rows[props.index];
							if (typeof row === "string") return listSubHeaderHeight;
							else if ("render" in row) return row.height;
							else return row.height + BaseGridCard.margin * 2;
						}}
						rowRenderer={props => {
							let row = rows[props.index];
							if (typeof row === "string") {
								return (
									<ListSubheader key={props.index} component="div" style={props.style}>
										{row}
									</ListSubheader>
								);
							} else if ("render" in row) {
								return row.render(props);
							} else {
								let { card, canSelect, scale } = row;
								return (
									<div key={props.index} style={props.style}>
										{row.objectIds.map(id => (
											<card.component
												key={id}
												modelId={id}
												scale={scale}
												selected={canSelect && this.state.selection.includes(id)}
												selectOnTap={canSelect && this.state.selection.length > 0}
												onSelect={canSelect ? this.selectionManager.select : null}
												onMenu={(modelId, anchorPos) => this.actionManager.current.menuOpen(anchorPos)}
											/>
										))}
									</div>
								);
							}
						}}
					/>
				</div>
			</Fragment>
		);
	}
}

/**
 * Create a new, styled GridView component
 * @param rootModelClass The Model to use as the root
 */
export function makeGridView(rootModelClass: typeof RootModel) {
	return withWidth()(
		withStyles(GridView.styles)(
			class extends GridView {
				static rootModelClass = rootModelClass;
			}
		)
	);
}