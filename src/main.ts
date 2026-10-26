/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageModel } from './model.ts';
import { ViewController } from './viewController.ts';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root') || document.body;
  const model = new StorageModel();
  new ViewController(model, root);
});
