import { Hidden, Icon, IconButton, InputAdornment, TextField, Theme, Typography, withStyles, withWidth, Zoom } from "@material-ui/core";
import { Breakpoint } from "@material-ui/core/styles/createBreakpoints";
import { isWidthUp } from "@material-ui/core/withWidth";
import React from "react";
import { Folder } from "../../models";
import { addressRootTypes } from "../App";
import { LocationManager } from "../utils";

/** Address bar element */
class AddressBar extends React.Component<{ rootType: addressRootTypes, rootId: number, classes: { addressBar: string, address: string, search: string, searchIcon: string, searchShowIcon: string }, width: Breakpoint }> {
	static styles = (theme: Theme) => ({
		addressBar: {
			backgroundColor: theme.palette.background.paper
		},
		address: {
			display: "inline"
		},
		search: {
			float: "right" as "right",
			[theme.breakpoints.down("xs")]: {
				position: "absolute" as "absolute",
				backgroundColor: "white",
				width: "100%",
				left: 0,
				padding: "0 10px"
			}
		},
		searchIcon: {
			cursor: "pointer" as "pointer"
		},
		searchShowIcon: {
			float: "right" as "right"
		}
	});


	/**
	 * Determine whether two versions of `this.props` are the same
	 * @param props1 The first version
	 * @param props2 The second version
	 * @returns Whether or not they are equal
	 */
	private static compareProps(props1: { rootType: addressRootTypes, rootId: number }, props2: { rootType: addressRootTypes, rootId: number }): boolean {
		return props1.rootType === props2.rootType && props1.rootId === props2.rootId;
	}


	state = {
		address: "/",
		searchValue: "",
		searchShown: false
	}


	constructor (props) {
		super(props);

		this.fetchAddress(props);
	}


	/**
	 * Get the address to display, based on `this.props`
	 * @param props The value of `this.props` to use
	 * @returns Promise representing the address
	 */
	private async getAddress (props: { rootType: addressRootTypes, rootId: number }): Promise<string> {
		if (props.rootId === null) return "/";

		switch (props.rootType) {
			case "folders":
				const folder = await Folder.loadObject<Folder>(props.rootId);
				return folder.path;
		}
	}

	/**
	 * Load the display address into `this.state`
	 * (calls `this.setState`)
	 * @param props The value of `this.props` to use
	 */
	private fetchAddress (props: { rootType: addressRootTypes, rootId: number }) {
		this.getAddress(props).then(address => {
			if (AddressBar.compareProps(props, this.props)) {
				this.setState({ address: address });
			}
		});
	}

	/** Move up to the parent folder (or other container) */
	private moveUp = () => {
		if (this.props.rootId === null) return;

		switch (this.props.rootType) {
			case "folders":
				let folder = Folder.getById(this.props.rootId);
				LocationManager.updateLocation("/folders/" + (folder.parentID ? `${ folder.parentID }/` : ""));
		}
	}

	private search () {
		LocationManager.updateQuery({ "search": this.state.searchValue });
	}


	shouldComponentUpdate (nextProps) {
		if (AddressBar.compareProps(this.props, nextProps)) {
			// If props are unchanged, then state must have changed, so re-render
			return true;
		} else {
			// If props have changed, fetch the new address, which will update the state
			this.fetchAddress(nextProps);
			return false;
		}
	}

	render () {
		let searchShown = isWidthUp("sm", this.props.width) ? true : this.state.searchShown;

		return <div className={this.props.classes.addressBar}>
			{/* Navigation buttons */}
			<span>
				<IconButton title="Back" onClick={ () => LocationManager.instance.props.history.goBack() }>
					<Icon>arrow_back</Icon>
				</IconButton>

				<IconButton title="Forward" onClick={ () => LocationManager.instance.props.history.goForward() }>
					<Icon>arrow_forward</Icon>
				</IconButton>

				<IconButton title="Up" onClick={ this.moveUp }>
					<Icon>arrow_upward</Icon>
				</IconButton>

				<IconButton title="Return to root folders" onClick={ () => LocationManager.updateLocation("/folders/") }>
					<Icon>home</Icon>
				</IconButton>
			</span>

			{/* Page address (i.e. folder path) */}
			<Typography className={ this.props.classes.address }>{ this.state.address }</Typography>

			{/* Button to show/hide search bar on mobile */}
			<Hidden smUp>
				<IconButton className={ this.props.classes.searchShowIcon } onClick={ () => this.setState({ searchShown: true }) }>
					<Icon>search</Icon>
				</IconButton>
			</Hidden>

			{/* Search bar (with zoom effect for mobile) */}
			<Zoom in={ searchShown } style={ { transformOrigin: '100% 50% 0' } }>
				<TextField className={ this.props.classes.search }
					placeholder="Search"
					title="Search the current view for files"
					defaultValue={ LocationManager.currentQuery.get("search") }
					onKeyDown={ (event) => { if (event.key === "Enter") this.search(); } }
					onChange={ (event) => this.state.searchValue = event.currentTarget.value }
					InputProps={ {
						startAdornment: (
							<Hidden smUp>
								<InputAdornment className={ this.props.classes.searchIcon } position="start" onClick={ () => this.setState({ searchShown: false }) }>
									<Icon>arrow_back</Icon>
								</InputAdornment>
							</Hidden>
						),
						endAdornment: (
							<InputAdornment className={ this.props.classes.searchIcon } position="end" onClick={ () => this.search() }>
								<Icon>search</Icon>
							</InputAdornment>
						)
					} } />
			</Zoom>
		</div>;
	}
}

export default withWidth()(withStyles(AddressBar.styles)(AddressBar));