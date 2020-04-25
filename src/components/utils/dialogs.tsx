import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, ListItemText, Radio, TextField } from "@material-ui/core";
import React from "react";
import MountTrackedComponent from "./MountTrackedComponent";

/**
 * A template for a common form of Material-UI dialog
 * @param open A state variable determining whether the dialog is open
 * @param onClose A function which closes the dialog (i.e. by setting "open" to false)
 * @param title The DialogTitle to display
 * @param text The DialogContentText (if any) to display
 * @param actionText The name of the primary DialogAction (the secondary will always be "Cancel")
 * @param action The function to run when the primary DialogAction button is clicked
 */
export class SimpleDialog extends MountTrackedComponent<{
	open: boolean;
	onClose: () => void;
	title: string;
	text?: React.ReactNode;
	actionText: string;
	action: () => Promise<any>;
}> {
	state = {
		loading: false
	};

	render() {
		return (
			<Dialog open={this.props.open} onClose={this.props.onClose}>
				<DialogTitle>{this.props.title}</DialogTitle>
				<DialogContent>
					{Boolean(this.props.text) && <DialogContentText>{this.props.text}</DialogContentText>}
					{this.props.children}
				</DialogContent>
				<DialogActions>
					<Button disabled={this.state.loading} onClick={this.props.onClose} color="primary">
						Cancel
					</Button>
					<Button
						disabled={this.state.loading}
						onClick={() => {
							this.setState({ loading: true });
							this.props.action().then(() => {
								this.props.onClose();
								this.setStateSafe({ loading: false });
							});
						}}
						color="primary"
					>
						{this.props.actionText}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}
}

/**
 * Simple Material-UI dialog with List selection
 * (most props are passed to base SimpleDialog)
 * @param open A state variable determining whether the dialog is open
 * @param onClose A function which closes the dialog (i.e. by setting "open" to false)
 * @param title The DialogTitle to display
 * @param text The DialogContentText (if any) to display
 * @param actionText The name of the primary DialogAction (the secondary will always be "Cancel")
 * @param action The function to run when the primary DialogAction button is clicked
 * @param list List of items to display and select from
 * @param selected ID of initially selected item
 * @param nullItem Default item with an ID of `null`
 */
export class ListDialog extends React.Component<{
	open: boolean;
	onClose: () => void;
	title: string;
	text?: string;
	actionText: string;
	action: (selected: number) => Promise<any>;
	list: { id: number; name: string }[];
	selected?: number;
	nullItem?: string;
}> {
	state: {
		selected: number;
	};

	constructor(props) {
		super(props);

		this.state = { selected: props.selected };
	}

	render() {
		return (
			<SimpleDialog
				open={this.props.open}
				onClose={this.props.onClose}
				title={this.props.title}
				actionText={this.props.actionText}
				action={() => this.props.action(this.state.selected)}
			>
				<List>
					{this.props.nullItem && (
						<ListItem key={-1} button onClick={() => this.setState({ selected: null })}>
							<Radio checked={this.state.selected === null} />
							<ListItemText primary={this.props.nullItem} />
						</ListItem>
					)}
					{this.props.list.map(item => (
						<ListItem key={item.id} button onClick={() => this.setState({ selected: item.id })}>
							<Radio checked={this.state.selected === item.id} />
							<ListItemText primary={item.name} />
						</ListItem>
					))}
				</List>
			</SimpleDialog>
		);
	}
}

/**
 * Simple Material-UI dialog with a TextField
 * @param open A state variable determining whether the dialog is open
 * @param onClose A function which closes the dialog (i.e. by setting "open" to false)
 * @param title The DialogTitle to display
 * @param actionText The name of the primary DialogAction (the secondary will always be "Cancel")
 * @param action The function to run when the primary DialogAction button is clicked
 * @param label The label of the TextField component
 * @param defaultValue Initial value of the TextField component
 */
export class TextDialog extends React.Component<{
	open: boolean;
	onClose: () => void;
	title: string;
	actionText: string;
	action: (text: string) => Promise<any>;
	label: string;
	defaultValue?: string;
}> {
	state: {
		value: string;
	};

	constructor(props) {
		super(props);

		this.state = { value: props.defaultValue };
	}

	render() {
		return (
			<SimpleDialog
				open={this.props.open}
				onClose={this.props.onClose}
				title={this.props.title}
				actionText={this.props.actionText}
				action={() => this.props.action(this.state.value)}
			>
				<TextField autoFocus label={this.props.label} defaultValue={this.props.defaultValue} onChange={event => (this.state.value = event.currentTarget.value)} />
			</SimpleDialog>
		);
	}
}