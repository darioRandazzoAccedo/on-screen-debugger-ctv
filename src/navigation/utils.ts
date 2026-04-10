import lrud from './lrud';

export function registerOverride(
  source: string,
  target: string,
  direction: 'up' | 'down' | 'left' | 'right',
) {
  if (!lrud.getNode(source)) {
    console.error(`Origin node ${source} does not exist`);

    return;
  }

  if (!lrud.getNode(target)) {
    console.error(`Target node ${target} does not exist`);

    return;
  }

  const sourceNode = lrud.getNode(source);
  const targetNode = lrud.getNode(target);

  if (sourceNode?.overrides?.[direction]) {
    // override with same target already exists
    if (sourceNode.overrides[direction] === targetNode) {
      return;
    }

    console.warn(
      `Override from ${source} to ${target} in direction ${direction} already exists. It will be removed to register the new overide`,
    );

    lrud.unregisterOverride(sourceNode.id, direction);
  }

  lrud.registerOverride(source, target, direction);
}

export default {
  registerOverride,
};
