import '../../app.css';
import { mount } from 'svelte';
import { syncToolbarIcon } from '../../lib/toolbar-icon';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
syncToolbarIcon();
