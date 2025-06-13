<script>
    import { onMount } from "svelte";
    import { Button, Label, Input, Checkbox, Datepicker, Dropdown, DropdownItem, Select } from "flowbite-svelte";
    import { BottomNav, BottomNavItem, Tooltip, Card, Accordion, AccordionItem, Modal } from "flowbite-svelte";
    import { HomeSolid, AdjustmentsVerticalOutline, CirclePlusSolid } from "flowbite-svelte-icons";
    import { blur, fade } from "svelte/transition";
    import { initializeApp } from "firebase/app";
    import { getAnalytics } from "firebase/analytics";
    import { saveDataToKey, getDataByKey, deleteDataByKey } from '$lib/firebase.js';
    import { pwaInfo } from 'virtual:pwa-info'
    

    let appKey = "";
    let newKeyInput = "";
    let error = "";

    let warningModal = false;

    function generateRandomHexKey(bytesCount) {
        const randomBytes = new Uint8Array(bytesCount);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    function isValidKey(key) {
        return /^[a-f0-9]{32}$/i.test(key);
    }

    function handleKeyChange() {
        if (isValidKey(newKeyInput)) {
            warningModal = true
        } else {
            error = "Invalid key format. Must be 64 hex characters.";
        }
    }

    function handleRegenerate() {
        newKeyInput = generateRandomHexKey(32); 
        error = "";
    }

    function undoChanges() {
        const stored = localStorage.getItem('appKey');
        if (stored) {
            appKey = stored;
            newKeyInput = "";
            error = "";
        } else {
            error = "No previous key found.";
        }
    }

    async function confirmChange() {
        const oldKey = appKey;
        let oldData = null;
        if (oldKey && oldKey !== newKeyInput) {
            oldData = await getDataByKey(oldKey);
        }

        localStorage.setItem('appKey', newKeyInput);
        appKey = newKeyInput;
        warningModal = false;
        newKeyInput = "";

        if (oldData) {
            await saveDataToKey(appKey, oldData);
            await deleteDataByKey(oldKey);
        } else {
            await deleteDataByKey(appKey);
        }
    }

    onMount(() => {
        const stored = localStorage.getItem('appKey');
        if (stored) appKey = stored;
    });

    // pwa stuff

    onMount(async () => {
    if (pwaInfo) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({
        immediate: true,
        onRegistered(r) {
        // uncomment following code if you want check for updates
        // r && setInterval(() => {
        //    console.log('Checking for sw update')
        //    r.update()
        // }, 20000 /* 20s for testing purposes */)
        console.log(`SW Registered: ${r}`)
        },
            onRegisterError(error) {
            console.log('SW registration error', error)
            }
        })
        }
    })
    
    $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : ''
</script>

<svelte:head>
    {@html webManifest}
</svelte:head>

<div class="w-full flex items-center justify-center"> 
    <div class="max-w-[1280px] w-full">
        <h1 class="text-white text-3xl p-6 font-medium">Settings</h1>
        <div class="pl-4 pr-4 w-full overflow-y-auto mt-8 flex items-center justify-center" style="padding-bottom: 160px;"> 
            <Card class="mb-8 w-full p-4 max-w-[700px]">
                <Label for="appKey" class="mb-2 block">App Key</Label>
                <Input id="appKey" value={appKey} readonly class="mb-2" />
                <div class="flex flex-col items-center justify-center mt-8 mb-12">
                    <img src='https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={appKey}' alt="QR Code" class="mb-4 w-64 h-64" />
                    <p class="dark:text-white">Scan this QR code with another device to copy the app key.</p>
                </div>
                <Label for="newKey" class="mb-2 block">Change App Key</Label>
                <Input id="newKey" bind:value={newKeyInput} placeholder="Paste a valid app key..." class="mb-2" />
                {#if error}
                    <div class="text-red-500 text-sm mb-2">{error}</div>
                {/if}
                <div class="flex gap-2">
                    <Button onclick={handleKeyChange} color="primary">Set Key</Button>
                    <Button onclick={handleRegenerate} color="secondary">Regenerate</Button>
                    <Button onclick={undoChanges} color="light">Undo Changes</Button>
                </div>
            </Card>
        </div>
    </div>
</div>

<Modal title="Warning" bind:open={warningModal} class="max-h-none relative" bodyClass="overflow-y-auto max-h-none relative">
    <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300">You are about to change the app key, This is not recommended unless you are linking two devices together. Any data stored on the database under this key will be deleted, while data stored locally on the device will be carried over to the new key. </p>
    </div>
    <div class="flex justify-end p-4 gap-4">
        <Button color="light" onclick={() => warningModal = false}>Cancel</Button>
        <Button color="primary" onclick={confirmChange}>Confirm</Button>
    </div>
</Modal>

<BottomNav position="fixed" navType="application" innerClass="grid-cols-1">
    <BottomNavItem btnName="Home" appBtnPosition="middle" btnClass="rounded-l-4xl rounded-r-4xl" href="/">
        <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
    </BottomNavItem>
    <Tooltip arrow={false}>Settings</Tooltip>
</BottomNav>