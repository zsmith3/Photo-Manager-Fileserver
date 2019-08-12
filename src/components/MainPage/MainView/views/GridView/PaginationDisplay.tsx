import { Grid, MenuItem, Select, Theme, Typography, withStyles, withWidth } from "@material-ui/core";
import { Breakpoint } from "@material-ui/core/styles/createBreakpoints";
import { CSSProperties } from "@material-ui/core/styles/withStyles";
import { isWidthUp } from "@material-ui/core/withWidth";
import React from "react";
import { Link } from "react-router-dom";
import { LocationManager } from "../../../../utils";

/** CSS Styles for PaginationDisplay */
interface Styles<T> {
	container: T;
	title: T;
	pageList: T;
	link: T;
	rightLink: T;
	menuItem: T;
}

/** Props for PaginationDisplay */
interface Props {
	/** Current page number */
	page: number;

	/** Items per page */
	pageSize: number;

	/** Total number of items to paginate */
	totalCount: number;

	/** CSS classes */
	classes: Styles<string>;

	/** Screen width */
	width: Breakpoint;
}

/** Component to display pagination links */
class PaginationDisplay extends React.Component<Props> {
	static styles = (theme: Theme) =>
		({
			container: {
				[theme.breakpoints.up("md")]: {
					padding: 4
				},
				[theme.breakpoints.down("sm")]: {
					paddingRight: 20
				},
				textAlign: "center"
			},
			title: {
				display: "inline-block",
				lineHeight: "32px"
			},
			pageList: {
				lineHeight: "32px"
			},
			link: {
				color: "blue"
			},
			rightLink: {
				marginLeft: 5
			},
			menuItem: {
				width: 40
			}
		} as Styles<CSSProperties>);

	render() {
		let currentPage = this.props.page;
		let maxPage = Math.ceil(this.props.totalCount / this.props.pageSize);

		if (maxPage <= 1) return null;

		let pages: string[] = [];
		if (isWidthUp("md", this.props.width)) for (var i = Math.max(1, currentPage - 4); i <= Math.min(maxPage, currentPage + 4); i++) pages.push(i.toString());
		else for (var i = 1; i <= maxPage; i++) pages.push(i.toString());

		return (
			<Grid container className={this.props.classes.container}>
				{isWidthUp("md", this.props.width) ? (
					/* Standard desktop pages display */
					<Grid item xs={8}>
						<Typography variant="body1" className={this.props.classes.pageList}>
							{currentPage > 1 && (
								<Link className={this.props.classes.link} to={LocationManager.getUpdatedQueryLocation({ page: "1" })}>
									{"<<"}
								</Link>
							)}
							{pages.map(page => (
								<Link
									className={this.props.classes.rightLink}
									key={page}
									to={LocationManager.getUpdatedQueryLocation({ page: page })}
									style={parseInt(page) === currentPage ? { color: "black", cursor: "default" } : { color: "blue" }}
								>
									{page}
								</Link>
							))}
							{currentPage < maxPage && (
								<Link className={this.props.classes.link + " " + this.props.classes.rightLink} to={LocationManager.getUpdatedQueryLocation({ page: maxPage.toString() })}>
									{">>"}
								</Link>
							)}
						</Typography>
					</Grid>
				) : (
					/* Mobile page selection */
					[
						<Grid item xs={3}>
							<Typography className={this.props.classes.title} variant="body1">
								Page:
							</Typography>
						</Grid>,
						<Grid item xs={3}>
							<Select value={currentPage} onChange={event => LocationManager.updateQuery({ page: event.target.value.toString() })}>
								{pages.map(page => (
									<MenuItem key={page} value={page} className={this.props.classes.menuItem}>
										{page}
									</MenuItem>
								))}
							</Select>
						</Grid>
					]
				)}

				{/* Page size selection */}
				<Grid item xs={3} md={2}>
					<Typography className={this.props.classes.title} variant="body1">
						Page Size:
					</Typography>
				</Grid>
				<Grid item xs={3} md={2}>
					<Select
						value={this.props.pageSize}
						onChange={event =>
							LocationManager.updateQuery({ page_size: event.target.value.toString(), page: Math.ceil(this.props.totalCount / parseInt(event.target.value.toString())).toString() })
						}
					>
						{[10, 25, 50, 100, 200, 500, 1000].map(page_size => (
							<MenuItem key={page_size} value={page_size} className={this.props.classes.menuItem}>
								{page_size}
							</MenuItem>
						))}
					</Select>
				</Grid>
			</Grid>
		);
	}
}

export default withWidth()(withStyles(PaginationDisplay.styles)(PaginationDisplay));
