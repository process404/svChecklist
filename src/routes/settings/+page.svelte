<script>
    import { onMount } from "svelte";
    import { Button, Label, Input, Card, Modal, BottomNav, BottomNavItem, Tooltip } from "flowbite-svelte";
    import { HomeSolid } from "flowbite-svelte-icons";
    import { getDataByKey, saveDataToKey, deleteDataByKey } from '$lib/firebase.js';
    import { pwaInfo } from 'virtual:pwa-info';
    
    let appKey = "";
    let newKeyInput = "";
    let error = "";
    let warningModal = false;
    let confirmImportModal = false;
    let importedData = null;

    function generateRandomHexKey(bytesCount) {
        const randomBytes = new Uint8Array(bytesCount);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    function isValidKey(key) {
        return /^[a-f0-9]{64}$/i.test(key);
    }

    function handleKeyChange() {
        if (isValidKey(newKeyInput)) {
            warningModal = true;
            error = "";
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
        let oldData = await getDataByKey(oldKey);
        
        localStorage.setItem('appKey', newKeyInput);
        appKey = newKeyInput;
        warningModal = false;
        newKeyInput = "";

        if (oldData) {
            const newData = { ...oldData, appKey: appKey };
            await saveDataToKey(newData);         
            await deleteDataByKey(oldKey);           
        } else {
            await deleteDataByKey(appKey).catch(e => console.log("No document to delete for new key.", e));
        }
    }

    onMount(() => {
        const stored = localStorage.getItem('appKey');
        if (stored) {
            appKey = stored;
        }
    });

    onMount(async () => {
        const storedKey = localStorage.getItem("appKey");
        if (storedKey) {
            appKey = storedKey;
            try {
                const fbData = await getDataByKey();
                const localData = JSON.parse(localStorage.getItem("checklistItems")) || [];
                
                if (fbData) {
                    const mergedData = [
                        ...localData,
                        ...fbData.checklistItems.filter(
                            item => !localData.some(localItem => localItem.id === item.id)
                        )
                    ];
                    checklistItems = mergedData;
                    localStorage.setItem("checklistItems", JSON.stringify(mergedData));
                    console.log("Loaded and merged data for key:", storedKey);
                } else {
                    console.warn("Document doesn't exist for the stored key; generating a new key.");
                    await generateNewAppKey();
                }
            } catch (e) {
                console.error("Error loading Firestore data with stored key:", e);
                await generateNewAppKey();
            }
        } else {
            await generateNewAppKey();
        }
    });
    
    onMount(async () => {
        if (pwaInfo) {
            const { registerSW } = await import('virtual:pwa-register');
            registerSW({
                immediate: true,
                onRegistered(r) {
                    console.log(`SW Registered: ${r}`);
                },
                onRegisterError(error) {
                    console.log("SW registration error", error);
                }
            });
        }
    });
    
    $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : '';

    function exportDataJSON() {
        const data = localStorage.getItem("checklistItems");
        if (!data) {
            alert("No checklist data to export.");
            return;
        }
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "checklist-data.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportDataText() {
        const data = localStorage.getItem("checklistItems");
        if (!data) {
            alert("No checklist data to export.");
            return;
        }
        let items;
        try {
            items = JSON.parse(data);
        } catch (e) {
            alert("Stored data is not valid JSON.");
            return;
        }
  
        const grouped = items.reduce((acc, item) => {
            const groupName = item.group && item.group.trim() ? item.group : "Ungrouped";
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(item);
            return acc;
        }, {});
  
        const sortedGroupNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  
        let textOutput = "Checklist Items:\n\n";
        sortedGroupNames.forEach(groupName => {
          const sortedItems = grouped[groupName].sort((a, b) => a.id - b.id);
          textOutput += `Group: ${groupName}\n`;
          sortedItems.forEach((item, i) => {
            textOutput += `  ${i + 1}. Title: ${item.title || "N/A"}\n`;
            textOutput += `       Description: ${item.description || "N/A"}\n`;
            textOutput += `       Due Date: ${item.dueDate || "N/A"}\n`;
          });
          textOutput += "\n";
        });
  
        const blob = new Blob([textOutput], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "checklist-data.txt";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                importedData = parsedData;
                confirmImportModal = true;
            } catch (err) {
                console.error(err);
                alert("Error importing data. Make sure the file contains valid JSON.");
            }
        };
        reader.readAsText(file);
    }

    async function confirmImport() {
        if (importedData) {
            try {
                localStorage.setItem("checklistItems", JSON.stringify(importedData));
                await saveDataToKey({ checklistItems: importedData });
                importedData = null;
                confirmImportModal = false;
                alert("Data imported and synced to Firebase successfully!");
            } catch (err) {
                console.error("Error saving to Firebase:", err);
                alert("Error saving data to Firebase.");
            }
        }
    }
</script>

<svelte:head>
    {@html webManifest}
</svelte:head>

<main>
    <div class="w-full flex items-center justify-center"> 
        <div class="max-w-[1280px] w-full">
            <h1 class="text-white text-3xl p-6 font-medium">Settings</h1>
            <div class="pl-4 pr-4 w-full overflow-y-auto mt-8 flex items-center justify-center"> 
                <Card class="mb-8 w-full p-4 max-w-[700px]">
                    <Label for="appKey" class="mb-2 block">App Key</Label>
                    <Input id="appKey" value={appKey} readonly class="mb-2" />
                    <div class="flex flex-col items-center justify-center mt-8 mb-12">
                        <img src={ appKey ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${appKey}` : '' } alt="QR Code" class="mb-4 w-64 h-64" />
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
            <div class="pl-4 pr-4 w-full overflow-y-auto mt-8 flex items-center justify-center" style="padding-bottom: 160px;"> 
                <Card class="flex gap-4 mt-4 p-8 max-w-[700px] w-full">
                    <Button onclick={exportDataJSON} color="primary">Export Data as JSON</Button>
                    <Button onclick={exportDataText} color="secondary">Export Data as Text</Button>
                    <Button onclick={() => document.getElementById('importFile').click()} color="light">
                        Import Data
                    </Button>
                    <input id="importFile" type="file" accept="application/json" class="hidden" on:change={importData} />
                </Card>
            </div>
        </div>
    </div>
    
    <Modal title="Warning" bind:open={warningModal} class="max-h-none relative" bodyClass="overflow-y-auto max-h-none relative">
        <div class="p-6">
            <p class="text-gray-700 dark:text-gray-300">
                You are about to change the app key. This is not recommended unless you are linking two devices together.
                Any data stored on the database under this key will be deleted, while data stored locally on the device
                will be carried over to the new key.
            </p>
        </div>
        <div class="flex justify-end p-4 gap-4">
            <Button onclick={() => warningModal = false} color="light">Cancel</Button>
            <Button onclick={confirmChange} color="primary">Confirm</Button>
        </div>
    </Modal>
    
    <BottomNav position="fixed" navType="application" innerClass="grid-cols-1">
        <BottomNavItem btnName="Home" appBtnPosition="middle" btnClass="rounded-l-4xl rounded-r-4xl" href="/">
            <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
        </BottomNavItem>
        <Tooltip arrow={false}>Settings</Tooltip>
    </BottomNav>

    <Modal title="Confirm Import" bind:open={confirmImportModal} class="max-h-none relative" bodyClass="overflow-y-auto max-h-none relative">
        <div class="p-6">
            <p class="text-gray-700 dark:text-gray-300">
                Are you sure you want to import this data? This will overwrite your current checklist.
            </p>
        </div>
        <div class="flex justify-end p-4 gap-4">
            <Button onclick={() => { confirmImportModal = false; importedData = null; }} color="light">Cancel</Button>
            <Button onclick={confirmImport} color="primary">Confirm Import</Button>
        </div>
    </Modal>

</main>
