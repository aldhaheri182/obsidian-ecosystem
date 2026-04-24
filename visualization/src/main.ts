/**
 * Cinematic Observatory bootstrap.
 * Mounts the Svelte App into #app and injects global stylesheets.
 */

import './styles/globals.css';
import App from './App.svelte';
import { mount } from 'svelte';

const target = document.getElementById('app');
if (!target) throw new Error('#app mount node missing');

const app = mount(App, { target });
export default app;
