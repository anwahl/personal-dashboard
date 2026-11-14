<script lang="ts">
	/**
	 * Search box with natural-language dates (N2). A date phrase in the text
	 * ("dentist next friday") filters by due date right away; on Enter or when
	 * you leave the box, the phrase becomes a removable chip and the rest stays
	 * as text. (Not on space, so ranges like "nov 10 - 16" can still be typed.)
	 * One date at a time; removing the chip drops the date.
	 *
	 * `value` (text) and `date` follow typing after a short pause, so each
	 * keystroke isn't a request.
	 */
	import { untrack } from 'svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import { findDate, type FoundDate } from '#lib/search-date.ts';
	import { formatRange, type DateRange } from './filter.ts';
	import styles from './SearchInput.module.css';

	let {
		value = $bindable(''),
		date = $bindable(null),
		referenceDate,
		placeholder = 'Search…',
		delay = 300,
		onfocus,
		onblur,
		class: className
	}: {
		value?: string;
		date?: DateRange | null;
		/** The day relative phrases ("tomorrow") count from. */
		referenceDate: string;
		placeholder?: string;
		delay?: number;
		onfocus?: () => void;
		onblur?: () => void;
		class?: string;
	} = $props();

	// What's in the box right now, the committed chip, and a phrase not yet turned into a chip.
	let text = $state('');
	let chip = $state<DateRange | null>(null);
	let pending = $state<FoundDate | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Outside changes (e.g. Reset) replace what's shown; typing alone doesn't re-run this.
	$effect.pre(() => {
		const outsideText = value;
		const outsideDate = date;
		untrack(() => {
			const shownText = (pending ? pending.rest : text).trim();
			const shownDate = pending?.range ?? chip;
			if (outsideText !== shownText || !sameRange(outsideDate, shownDate)) {
				clearTimeout(timer);
				text = outsideText;
				chip = outsideDate;
				pending = null;
			}
		});
	});

	function sameRange(a: DateRange | null, b: DateRange | null) {
		return a === b || (!!a && !!b && a.from === b.from && a.to === b.to);
	}

	function publish() {
		value = (pending ? pending.rest : text).trim();
		date = pending?.range ?? chip;
	}

	function oninput() {
		pending = findDate(text, referenceDate);
		clearTimeout(timer);
		timer = setTimeout(publish, delay);
	}

	/** Turn the pending phrase into the chip (replacing any earlier one). */
	function commit() {
		if (!pending) return;
		const caretAfter = pending.index;
		chip = pending.range;
		text = (text.slice(0, pending.index) + text.slice(pending.index + pending.phrase.length)).replace(/\s{2,}/g, ' ');
		pending = null;
		publish();
		queueMicrotask(() => input?.setSelectionRange(caretAfter, caretAfter));
	}

	function removeChip() {
		chip = null;
		publish();
		input?.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			commit();
			clearTimeout(timer);
			publish();
		} else if (e.key === 'Backspace' && chip && input?.selectionStart === 0 && input.selectionEnd === 0) {
			removeChip();
		}
	}
</script>

<label class={[styles.box, className]}>
	<SearchIcon class={styles.icon} aria-hidden="true" />
	{#if chip}
		<span class={styles.chip}>
			<CalendarIcon aria-hidden="true" />
			<span>{formatRange(chip)}</span>
			<button type="button" class={styles.chipRemove} aria-label="Remove date {formatRange(chip)}" onclick={removeChip}>
				<XIcon aria-hidden="true" />
			</button>
		</span>
	{/if}
	<input
		bind:this={input}
		type="search"
		class={styles.input}
		aria-label={placeholder}
		placeholder={chip ? '' : placeholder}
		bind:value={text}
		{oninput}
		{onkeydown}
		{onfocus}
		onblur={() => {
			commit();
			onblur?.();
		}}
	/>
</label>
