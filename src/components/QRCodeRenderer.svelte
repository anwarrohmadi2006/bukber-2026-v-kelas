<script lang="ts">
    import { onMount } from "svelte";
    import QRCode from "qrcode";

    export let qrisRawData: string;
    let qrisDataUri: string = "";

    onMount(async () => {
        try {
            qrisDataUri = await QRCode.toDataURL(qrisRawData, {
                width: 300,
                margin: 2,
                color: { dark: "#064e3b", light: "#ffffff" },
            });
        } catch (e) {
            console.error("Failed to generate QR Code on client:", e);
        }
    });
</script>

{#if qrisDataUri}
    <img
        src={qrisDataUri}
        alt="QR Code QRIS Bukber"
        class="w-48 h-48 md:w-56 md:h-56 mx-auto rounded-xl ring-2 ring-emerald-50 mb-3"
    />
{:else}
    <div
        class="w-48 h-48 md:w-56 md:h-56 mx-auto rounded-xl ring-2 ring-gray-100 bg-gray-50 flex flex-col items-center justify-center mb-3 animate-pulse"
    >
        <div
            class="w-8 h-8 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"
        ></div>
        <p class="text-xs text-emerald-600 mt-3 font-medium">Memuat QRIS...</p>
    </div>
{/if}
