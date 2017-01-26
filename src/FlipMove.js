/**
 * React Flip Move
 * (c) 2016-present Joshua Comeau
 *
 * How it works:
 * The basic idea with this component is pretty straightforward:
 *
 *   - We track all rendered elements by their `key` property, and we keep
 *     their bounding boxes (their top/left/right/bottom coordinates) in this
 *     component's state.
 *   - When the component updates, we compare its former position (held in
 *     state) with its new position (derived from the DOM after update).
 *   - If the two have moved, we use the FLIP technique to animate the
 *     transition between their positions.
 */

// TODO: why does personal fly back, it should mvoe smoothly. & with refs
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

import './polyfills';
import propConverter from './prop-converter';
import {
  whichTransitionEvent, filterNewItems, applyStylesToDOMNode
} from './helpers.js';

const transitionEnd = whichTransitionEvent();

@propConverter
class FlipMove extends Component {
  constructor(props) {
    super(props);

    this.oldIndices = {};
    this.doesChildNeedToBeAnimated  = this.doesChildNeedToBeAnimated.bind(this);
    this.state = { children: props.children };

    this.remainingAnimations = 0;
    this.childrenToAnimate   = {
      elements: [],
      domNodes: []
    };

    this.originalDomStyles = {};
  }

  componentDidMount() {
    this.parentElement = ReactDOM.findDOMNode(this);
    this.calculateAndAnimateChildren();
  }

  componentDidUpdate(previousProps) {
    if (this.props.children !== previousProps.children) {
      this.calculateAndAnimateChildren();
    }
  }

  componentWillReceiveProps(nextProps) {
    const newIndices = this.props.children.reduce( (boxes, child) => {
      if ( !child.key || child.props === undefined ) return boxes;
      return { ...boxes, [child.key]: 90*child.props.index };
    }, {});
    this.oldIndices = {
      ...this.oldIndices,
      ...newIndices
    };
    this.setState({
      children: this.prepareNextChildren(nextProps.children)
    });
  }

  prepareNextChildren(nextChildren) {
    let updatedChildren = nextChildren.map( nextChild => {
      const child = this.state.children.find( ({key}) => key === nextChild.key );

      const isEntering = !child || child.leaving;

      return { ...nextChild, entering: isEntering };
    });

    let numOfChildrenLeaving = 0;
    this.state.children.forEach( (child, index) => {
      const isLeaving = !nextChildren.find( ({key}) => key === child.key );

      if ( !isLeaving || !this.props.leaveAnimation ) return;

      let nextChild = { ...child, leaving: true };
      let nextChildIndex = index + numOfChildrenLeaving;

      updatedChildren.splice(nextChildIndex, 0, nextChild);
      numOfChildrenLeaving++;
    });

    return updatedChildren;
  }

  calculateAndAnimateChildren() {
    if ( this.isAnimationDisabled() || !transitionEnd ) {
      return this.setState({ children: this.props.children });
    }

    const dynamicChildren = this.state.children.filter(
      this.doesChildNeedToBeAnimated
    );


    this.domStyles = dynamicChildren.reduce( (memo, child) => {
      memo[child.key] = this.computeInitialStyles(child);
      return memo;
    }, {});

    dynamicChildren.forEach( (child, index) => {
      this.addChildToAnimationsList(child);
      this.runAnimation(child, index);
    });

    if ( this.props.onStartAll ) {
      this.props.onStartAll(
        this.childrenToAnimate.elements,
        this.childrenToAnimate.domNodes
      );
    }
  }

  computeInitialStyles(child) {
    let style = { transition: '0ms' };
    if ( child.entering ) {
      if ( this.props.enterAnimation ) {
        style = {
          ...style,
          ...this.props.enterAnimation.from,
          transform: `translate3d(0px, ${90*child.props.index}px, 0px)` + ' ' + (this.props.enterAnimation.from.tranform || '')
        };
      }
    } else if ( child.leaving ) {
      if ( this.props.leaveAnimation ) {
        style = {
          ...style,
          ...this.props.leaveAnimation.from,
          transform: `translate3d(0px, ${90*child.props.index}px, 0px)` + ' ' + (this.props.leaveAnimation.from.tranform || '')
        };
      }
    } else {
      style.transform = this.getPositionTranslation(child);
    }

    return style;
  }

  isAnimationDisabled() {
    // If the component is explicitly passed a `disableAllAnimations` flag,
    // we can skip this whole process. Similarly, if all of the numbers have
    // been set to 0, there is no point in trying to animate; doing so would
    // only cause a flicker (and the intent is probably to disable animations)
    return (
      this.props.disableAllAnimations ||
      (
        this.props.duration === 0 &&
        this.props.delay === 0 &&
        this.props.staggerDurationBy === 0 &&
        this.props.staggerDelayBy === 0
      )
    );
  }

  doesChildNeedToBeAnimated(child) {
    if ( !child.key ) return;

    if (
      ( child.entering && this.props.enterAnimation ) ||
      ( child.leaving  && this.props.leaveAnimation )
    ) {
      return true;
    }
  }

  addChildToAnimationsList(child) {
    const domNode = ReactDOM.findDOMNode( this.refs[child.key] );

    this.remainingAnimations++;
    this.childrenToAnimate.elements.push(child);
    this.childrenToAnimate.domNodes.push(domNode);
  }

  runAnimation(child, n) {
    let domNode = ReactDOM.findDOMNode( this.refs[child.key] );
    var styles = this.domStyles[child.key] || {};

    applyStylesToDOMNode(domNode, styles);

    requestAnimationFrame( () => {
      requestAnimationFrame( () => {
        styles = {
          transition: this.createTransitionString(n),
          transform: styles.transform || '',
          opacity: ''
        };

        if ( child.entering && this.props.enterAnimation ) {
          styles = {
            ...styles,
            ...this.props.enterAnimation.to,
            transform: styles.transform + ' ' + (this.props.enterAnimation.to.tranform || '')
          };
        } else if ( child.leaving && this.props.leaveAnimation ) {
          styles = {
            ...styles,
            ...this.props.leaveAnimation.to,
            transform: styles.transform + ' ' + (this.props.leaveAnimation.to.tranform || '')
          };
        }

        applyStylesToDOMNode(domNode, styles);
      });
    });

    if ( this.props.onStart ) this.props.onStart(child, domNode);

    setTimeout(() => {
      domNode.style.transition = '';
      this.triggerFinishHooks(child, domNode);
    }, (n * this.props.staggerDurationBy) + this.props.duration);
  }

  getPositionTranslation(child) {
    var oY  = this.oldIndices[child.key] || 0;
    var cY = 90*child.props.index;
    return `translate3d(0px, ${cY}px, 0px)`;
  }

  createTransitionString(n, props=['transform', 'opacity']) {
    let { duration, staggerDurationBy, delay, staggerDelayBy, easing } = this.props;

    delay     += n * staggerDelayBy;
    duration  += n * staggerDurationBy;

    return props
      .map( prop => `${prop} ${duration}ms ${easing} ${delay}ms`)
      .join(', ');
  }

  triggerFinishHooks(child, domNode) {
    if ( this.props.onFinish ) this.props.onFinish(child, domNode);

    // Reduce the number of children we need to animate by 1,
    // so that we can tell when all children have finished.
    this.remainingAnimations--;
    if ( this.remainingAnimations === 0 ) {
      // Reset our variables for the next iteration
      this.childrenToAnimate.elements = [];
      this.childrenToAnimate.domNodes = [];

      // Remove any items from the DOM that have left, and reset `entering`.
      const nextChildren = this.state.children
        .filter( ({leaving}) => !leaving )
        .map(item => ({
          ...item,
          entering: false
        }));
      this.oldIndices = {};
      this.setState({ children: nextChildren }, () => {
        if ( typeof this.props.onFinishAll === 'function' ) {
          this.props.onFinishAll(
            this.childrenToAnimate.elements, this.childrenToAnimate.domNodes
          );
        }
      });
    }
  }


  childrenWithRefs() {
    return this.state.children.map( child => {
      return React.cloneElement(child, { ref: child.key });
    });
  }


  render() {
    return React.createElement(
      this.props.typeName,
      this.props.delegated,
      this.childrenWithRefs()
    );
  }
}



export default FlipMove;
