import { Icon } from "@material-ui/core";
import React, { Fragment } from "react";
import Hammer from "react-hammerjs";
import { FaceImgSizes, FileImgSizes, Platform } from "../../controllers/Platform";
import { Model } from "../../models";
import MountTrackedComponent from "./MountTrackedComponent";

type ImgSizes = FileImgSizes | FaceImgSizes;

interface ImageLoaderPropsType {
	/** The Model for which to render the image (File or Face) */
	model: Model & {
		imageMaterialIcon: string;
		loadImgData(size: ImgSizes, queue: boolean): Promise<string>;
		getBestImgSize(size: ImgSizes): ImgSizes;
	};

	/** Maximum image size to display */
	maxSize: ImgSizes;

	/** Minimum (first) image size to display */
	minSize?: ImgSizes;

	/** Maximum image size to load initially into `img.src`, when all sizes have already been downloaded locally */
	maxFirstSize?: ImgSizes;

	/** Whether to avoid load queue (if true, this image will be prioritised) */
	noQueue?: boolean;

	/** Handler function to run when image data for a new model is first loaded */
	onFirstLoad?(): void;

	/** Styling to pass to the internal `<img />` element */
	style: { width: number; height: number } & React.CSSProperties;

	/** Class (optional) to pass to the internal `<img />` element */
	className?: string;
}

/** Image component which loads different sizes one-by-one */
export default class ImageLoader extends MountTrackedComponent<ImageLoaderPropsType> {
	/** Track whether an image is currently being loaded, allowing `this.loadNext` to be called harmlessly at any time */
	private isLoading = false;

	/** ID of MediaQueueItem for currently loading image (used to cancel on unmount) */
	private imageQueueId: number = null;

	state = {
		loadState: null as ImgSizes,
		imageData: null as string
	};

	/**
	 * Attempt to load image data for a size
	 * @param size Size of image to load
	 * @param props Value of `this.props` to use (defaults to current value)
	 */
	loadImg(size: ImgSizes, props?: ImageLoaderPropsType): void {
		props = props || this.props;

		this.isLoading = true;

		props.model
			.loadImgData(size, !props.noQueue)
			.then(data => {
				if (props.model !== this.props.model) return;

				if (props.onFirstLoad && this.state.imageData === null) props.onFirstLoad();

				let oldState = this.state.loadState;
				this.setStateSafe({ imageData: data, loadState: size });
				this.isLoading = false;

				/*
			 When ImageModal switches files, loading the original (i.e. 24MP) file
			 immediately into `img.src` takes time even if it is already downloaded.
			 So we load the `Large` size, wait until it is actually displayed
			 (when `img.onLoad` is called) and only then load the original size.
			 In this instance, `oldState === null` because the file has just changed,
			 so `this.loadNext` is not called here (and is called below from `img.onLoad`).
			 The other instance where `oldState === null` would be when loading a new file,
			 in which case we have just downloaded the thumbnail so the delay of loading it
			 into `img.src` is minimal.
			 */
				if (oldState !== null) this.loadNext();
			})
			.catch(error => {
				this.setStateSafe({ loadState: size });
				this.isLoading = false;
				this.loadNext();
			});
		this.imageQueueId = Platform.mediaQueue.currentId;
	}

	/**
	 * Load the next image size (or stop when maxSize is reached)
	 * @param props Value of `this.props` to use (defaults to current value)
	 */
	loadNext(props?: ImageLoaderPropsType) {
		props = props || this.props;

		if (this.isLoading || (this.state.loadState !== null && this.state.loadState >= props.maxSize)) return;

		let nextState = this.state.loadState === null ? props.minSize || 0 : this.state.loadState + 1;

		this.loadImg(nextState, props);
	}

	/**
	 * Load the initial image (using the best existing size)
	 * @param props Value of `this.props` to use (defaults to current value)
	 */
	loadFirst(props: ImageLoaderPropsType): void {
		let startState = props.model.getBestImgSize(props.maxFirstSize === 0 ? 0 : props.maxFirstSize || props.maxSize);
		if (startState === null) this.loadNext(props);
		else this.loadImg(startState, props);
	}

	/** Reload the image on model updates */
	onModelUpdate = model => {
		this.state.imageData = null;
		this.state.loadState = null;
		this.loadFirst({ ...this.props, model: model });
		// TODO want to be able to run update handlers when a new img size is loaded
		// (e.g. so if we have two instances of the same image they update each other)
		// but this currently isn't worth it because this function is run repeatedly
		// want to refactor so that ImageLoader gets image src from update handlers,
		// rather than directly from the call to load
	};

	constructor(props: ImageLoaderPropsType) {
		super(props);

		this.updateHandler = props.model.class.getById(props.model.id).updateHandlers.register(this.onModelUpdate);
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		Platform.mediaQueue.cancel(this.imageQueueId);
	}

	shouldComponentUpdate(nextProps: ImageLoaderPropsType) {
		// If no important props have changed then re-render (image data loaded must still be correct)
		if (
			nextProps.model === this.props.model &&
			nextProps.maxSize === this.props.maxSize &&
			nextProps.minSize === this.props.minSize &&
			nextProps.maxFirstSize === this.props.maxFirstSize
		)
			return true;
		else {
			// Reset when model changes
			if (nextProps.model !== this.props.model) {
				this.state.imageData = null;
				this.state.loadState = null;
				this.updateHandler.unregister();
				// (initial load is run by update handler upon registering)
				this.updateHandler = nextProps.model.class.getById(nextProps.model.id).updateHandlers.register(this.onModelUpdate);
				return true;
			} else {
				// Run the initial load given the new props
				this.loadFirst(nextProps);

				// No re-render yet
				return false;
			}
		}
	}

	render() {
		// <Hammer> element seems to make external <Hammer> placed
		// around <ImageLoader /> actually work (not sure why)
		return (
			<Fragment>
				{this.state.imageData === null ? (
					this.props.style && (
						<Icon
							className={this.props.className}
							style={{
								...this.props.style,
								fontSize: Math.min(this.props.style.width, this.props.style.height),
								lineHeight: this.props.style.height + "px",
								textAlign: "center",
								backgroundColor: "white"
							}}
						>
							{this.props.model.imageMaterialIcon}
						</Icon>
					)
				) : (
					<Hammer>
						<img src={this.state.imageData} onLoad={() => this.loadNext()} className={this.props.className} style={this.props.style} />
					</Hammer>
				)}
			</Fragment>
		);
	}
}
