import '../../app.css';
import { mount } from 'svelte';
import { initColorMode } from '../../lib/color-mode';
import { syncToolbarIcon } from '../../lib/toolbar-icon';
import Popup from './Popup.svelte';

mount(Popup, { target: document.getElementById('app')! });
initColorMode();
syncToolbarIcon();
