<script lang="ts">
	/**
	 * Clock-dial time picker (timepicker-ui, Material-style), drawn inline so it
	 * can live inside a popover. `value` is `HH:mm` (24h), like `due_time`;
	 * it updates as the hand moves (no OK button).
	 */
	import { onMount } from 'svelte';
	import TimepickerUI from 'timepicker-ui';
	import 'timepicker-ui/main.css';
	import 'timepicker-ui/theme-dark.css';
	import styles from './TimeDial.module.css';

	let {
		value = $bindable(null),
		minuteStep = 5
	}: { value?: string | null; minuteStep?: number } = $props();

	let input: HTMLInputElement;
	let host: HTMLDivElement;

	onMount(() => {
		const picker = new TimepickerUI(input, {
			ui: {
				theme: 'dark',
				inline: { enabled: true, container: host, embedded: true, showTitle: false, autoUpdate: true }
			},
			clock: { type: '12h', incrementMinutes: minuteStep }
		});
		picker.create();
		picker.setValue(value ?? '09:00', false);

		const stop = picker.on('update', (t) => {
			value = to24h(t.hour, t.minutes, t.type);
		});

		return () => {
			stop();
			picker.destroy();
		};
	});

	/** "9", "05", "PM" → "21:05". */
	function to24h(h = '12', m = '00', period = 'AM') {
		let hour = Number(h) % 12;
		if (period === 'PM') hour += 12;
		return `${String(hour).padStart(2, '0')}:${m.padStart(2, '0')}`;
	}
</script>

<!-- timepicker-ui writes its text into an input; the dial below is what's shown. -->
<input bind:this={input} class="sr-only" tabindex="-1" aria-hidden="true" />
<div bind:this={host} class={styles.dial}></div>
