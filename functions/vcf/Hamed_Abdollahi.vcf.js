const TIME_ZONE = "Europe/Amsterdam";
const MEETING_NOTE_PATTERN = /When we met:[^\\\r\n]*/;

function formatMeetingTime(date) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const value = (type) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}:${value("second")} (${TIME_ZONE})`;
}

export async function onRequestGet({ env, request }) {
	const assetResponse = await env.ASSETS.fetch(request);

	if (!assetResponse.ok) {
		return assetResponse;
	}

	const meetingTime = formatMeetingTime(new Date());
	const vcard = (await assetResponse.text()).replace(
		MEETING_NOTE_PATTERN,
		`When we met: ${meetingTime}`,
	);

	return new Response(vcard, {
		headers: {
			"Cache-Control": "no-store, max-age=0",
			"Content-Disposition":
				'attachment; filename="Hamed_Abdollahi.vcf"',
			"Content-Type": "text/vcard; charset=utf-8",
		},
	});
}
