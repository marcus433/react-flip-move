/**
 * React Flip Move
 * (c) 2016-present Joshua Comeau
 */

export function convertToInt(val, propName) {
  const int = typeof val === 'string' ? parseInt(val) : val;

  if ( isNaN(int) ) {
    console.error(`Invalid prop '${propName}' supplied to FlipMove. Expected a number, or a string that can easily be resolved to a number (eg. "100"). Instead, received '${val}'.`)
  }

  return int;
}

export function convertAllToInt(...values) {
  return values.map(convertToInt);
}

export function filterNewItems(group1, group2, idProp = 'key') {
  // We want to find all items in group2 that are NOT in group1.
  return group2.filter( g2Item => {
    return !group1.find( g1Item => g1Item[idProp] === g2Item[idProp] );
  });
}

export function applyStylesToDOMNode(domNode, styles) {
  // Can't just do an object merge because domNode.styles is no regular object.
  // Need to do it this way for the engine to fire its `set` listeners.
  Object.keys(styles).forEach( key => {
    domNode.style[key] = styles[key];
  });
}

// Modified from Modernizr
export function whichTransitionEvent() {
  const transitions = {
    'transition':       'transitionend',
    'OTransition':      'oTransitionEnd',
    'MozTransition':    'transitionend',
    'WebkitTransition': 'webkitTransitionEnd'
  }

  // If we're running in a browserless environment (eg. SSR), it doesn't apply.
  // Return a string so that it maintains the type that is expected.
  if ( typeof document === 'undefined' ) return '';

  const el = document.createElement('fakeelement');

  for ( let t in transitions ) {
    if ( el.style[t] !== undefined ) return transitions[t];
  }
}

export function translate(node, x, y) {
  // Credit to http://stackoverflow.com/users/1336843/bali-balo for the matrix regex.
  if (window.getComputedStyle) {
    node = window.getComputedStyle(node);
    var transform = node.transform || node.webkitTransform || node.mozTransform || node.oTransform;
    if (!transform || 0 === transform.length)
      return "translate3d(" + (x || 0) + "px, " + (y || 0) + "px, 0px)"; // hardware accelerated translate3d
    if (node = transform.match(/^matrix3d\((.+)\)$/)) {
      node = node[1].split(",");
      node[12] = Math.abs((parseFloat(node[12]) || 0) + x);
      node[13] = Math.abs((parseFloat(node[13]) || 0) + y);
      return "matrix(" + node.join(",") + ")";
    }
    if (node = transform.match(/^matrix\((.+)\)$/)) {
      node = node[1].split(",");
      node[4] = Math.abs((parseFloat(node[4]) || 0) + x);
      node[5] = Math.abs((parseFloat(node[5]) || 0) + y);
      return "matrix(" + node.join(",") + ")";
    }
  }
}
