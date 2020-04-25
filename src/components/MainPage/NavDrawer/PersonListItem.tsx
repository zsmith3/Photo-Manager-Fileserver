import { Icon, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, ListSubheader, Menu, MenuItem, MenuList, withStyles } from "@material-ui/core";
import React, { Fragment } from "react";
import { Link } from "react-router-dom";
import { FaceImgSizes, Platform } from "../../../controllers/Platform";
import { Person, PersonGroup } from "../../../models";
import { HoverIconButton, ListDialog, LocationManager, MountTrackedComponent, SimpleDialog, TextDialog } from "../../utils";

/** Individual Person instance display, with menu for modification */
class PersonListItem extends MountTrackedComponent<{
	personId: number;
	visible: boolean;
	classes: { avatar: string; image: string };
}> {
	static style = {
		avatar: {
			marginRight: 10
		},
		image: {
			width: 22,
			height: 28
		}
	};

	state = {
		person: null as Person,
		menuAnchorEl: null,
		openCollapse: true,
		openMenu: false,
		openDialogRename: false,
		openDialogGroup: false,
		openDialogRemove: false,
		loading: false,
		thumbnailSrc: null as string
	};

	constructor(props: { personId: number; visible: boolean; classes: { avatar: string; image: string } }) {
		super(props);

		this.updateHandler = Person.getById(props.personId).updateHandlers.register((person: Person) => this.setStateSafe({ person: person }));
	}

	menuClose = () => {
		this.setState({ openMenu: false });
	};

	menuOpen = event => {
		this.setState({ menuAnchorEl: event.currentTarget, openMenu: true });
	};

	dialogOpen = type => this.setState({ ["openDialog" + type]: true });

	dialogClose = type => this.setStateSafe({ ["openDialog" + type]: false, loading: false });

	shouldComponentUpdate(nextProps, nextState) {
		if (!this.props.visible && nextProps.visible && this.state.thumbnailSrc === null && this.state.person.thumbnail !== null)
			Platform.getImgSrc({ id: this.state.person.thumbnail }, "face", FaceImgSizes.Standard, true).then(src => this.setState({ thumbnailSrc: src }));

		return this.props.personId !== nextProps.personId || this.state !== nextState;
	}

	render() {
		return (
			<Fragment>
				{/* Main Person list item */}
				<ListItem button>
					<span className={this.props.classes.avatar}>
						{this.state.thumbnailSrc ? <img className={this.props.classes.image} src={this.state.thumbnailSrc} /> : <Icon>face</Icon>}
					</span>

					<Link to={LocationManager.getUpdatedLocation(`/people/${this.state.person.id}/`, ["page"])}>
						<ListItemText
							primary={`${this.state.person.full_name} (${this.state.person.face_count_confirmed}${
								this.state.person.face_count_unconfirmed ? `/${this.state.person.face_count_unconfirmed}` : ""
							})`}
						/>
					</Link>

					<ListItemSecondaryAction>
						<HoverIconButton action={this.menuOpen}>more_vert</HoverIconButton>
					</ListItemSecondaryAction>
				</ListItem>

				{/* Linked menu and dialogs for modifying person */}
				<Fragment>
					{/* Options menu */}
					<Menu anchorEl={this.state.menuAnchorEl} open={this.state.openMenu} onClick={this.menuClose} onClose={this.menuClose}>
						<MenuList subheader={<ListSubheader style={{ lineHeight: "24px" }}>{this.state.person.full_name}</ListSubheader>}>
							<MenuItem onClick={() => this.dialogOpen("Rename")}>
								<ListItemIcon>
									<Icon>edit</Icon>
								</ListItemIcon>
								Rename
							</MenuItem>
							<MenuItem onClick={() => this.dialogOpen("Group")}>
								<ListItemIcon>
									<Icon>group</Icon>
								</ListItemIcon>
								Edit Group
							</MenuItem>
							<MenuItem onClick={() => this.dialogOpen("Remove")}>
								<ListItemIcon>
									<Icon>delete</Icon>
								</ListItemIcon>
								Remove
							</MenuItem>
						</MenuList>
					</Menu>

					{/* Person rename dialog */}
					<TextDialog
						open={this.state.openDialogRename}
						onClose={() => this.dialogClose("Rename")}
						title="Rename Person"
						actionText="Rename"
						label="Full Name"
						defaultValue={this.state.person.full_name}
						action={(name: string) =>
							Person.getById(this.props.personId).updateSave({
								full_name: name
							})
						}
					/>

					{/* Change group dialog */}
					<ListDialog
						open={this.state.openDialogGroup}
						onClose={() => this.dialogClose("Group")}
						title="Change person group"
						actionText="Change Group"
						list={PersonGroup.meta.objects}
						selected={this.state.person.group.id}
						action={(groupId: number) =>
							Person.getById(this.props.personId)
								.updateSave({ group: groupId })
								.then(() => Person.meta.listUpdateHandlers.handle())
						}
					/>

					{/* Delete person dialog */}
					<SimpleDialog
						open={this.state.openDialogRemove}
						onClose={() => this.dialogClose("Remove")}
						title="Remove Person"
						text={
							<Fragment>
								Are you sure you want to delete the person <i>{this.state.person.full_name}</i>?
							</Fragment>
						}
						actionText="Confirm"
						action={() => Person.getById(this.props.personId).delete()}
					/>
				</Fragment>
			</Fragment>
		);
	}
}

export default withStyles(PersonListItem.style)(PersonListItem);