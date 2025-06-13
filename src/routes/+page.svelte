<svelte:head>
    {@html webManifest}
</svelte:head>

<script>
    import { onMount } from "svelte";
    import { Button, Label, Input, Checkbox, Datepicker, Dropdown, DropdownItem, Select } from "flowbite-svelte";
    import { BottomNav, BottomNavItem, Tooltip, Card, Accordion, AccordionItem, Modal } from "flowbite-svelte";
    import { HomeSolid, AdjustmentsVerticalOutline, CirclePlusSolid } from "flowbite-svelte-icons";
    import { blur, fade } from "svelte/transition";
    import { saveDataToKey, getDataByKey, deleteDataByKey } from '$lib/firebase.js';
    import { browser } from '$app/environment';
    import { pwaInfo } from 'virtual:pwa-info';

    let defaultModal = false;
    let checklistItems = [];
    let modalMode = 'edit';

    let selectedDate = null;
    let selectedGroup = null;
    let newGroupName = '';
    let modalName = '';
    let modalDescription = '';

    let appKey = "";
    let editingId = null; 
    
    function generateRandomHexKey(bytesCount = 32) {
        const randomBytes = new Uint8Array(bytesCount);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    async function generateNewAppKey() {
        const newKey = generateRandomHexKey(32);
        localStorage.setItem("appKey", newKey);
        appKey = newKey;
        try {
            await saveDataToKey({ checklistItems: [] });
            checklistItems = [];
            localStorage.setItem("checklistItems", JSON.stringify(checklistItems));
            console.log("Created document for new key:", newKey);
        } catch (e) {
            console.error("Failed to create document for new key:", e);
        }
    }

    function formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'long' });
        const year = d.getFullYear();
        function ordinal(n) {
            if (n > 3 && n < 21) return n + 'th';
            switch (n % 10) {
                case 1: return n + "st";
                case 2: return n + "nd";
                case 3: return n + "rd";
                default: return n + "th";
            }
        }
        return `${ordinal(day)} ${month} ${year}`;
    }

    onMount(async () => {
        const storedKey = localStorage.getItem("appKey");
        if (storedKey) {
            appKey = storedKey;
            try {
                const fbData = await getDataByKey();
                const localData = JSON.parse(localStorage.getItem("checklistItems")) || [];
                
                if (fbData && fbData.checklistItems) {
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
                    await saveDataToKey({ checklistItems: localData });
                    console.log("No checklist found in Firestore; initializing with localData or empty list.");
                }
            } catch (e) {
                console.error("Error loading Firestore data with stored key:", e);
            }
        } else {
            await generateNewAppKey();
        }
    });

    async function saveToLocalStorage() {
        localStorage.setItem("checklistItems", JSON.stringify(checklistItems));
        await saveDataToKey({ checklistItems });
    }

    function openModalEdit(item) {
        modalMode = 'edit';
        defaultModal = true;
        editingId = item.id;
        modalName = item.title;
        modalDescription = item.description;
        selectedDate = item.dueDate ? new Date(item.dueDate) : null;
        selectedGroup = item.group;
        newGroupName = '';
    }

    function openModalAdd() {
        modalMode = 'add';
        defaultModal = true;
        modalName = '';
        modalDescription = '';
        selectedDate = null;
        selectedGroup = '';
        newGroupName = '';
    }

    const handleEdit = async () => {
        if (!modalName.trim()) {
            alert("Name cannot be blank.");
            return;
        }
        
        checklistItems = checklistItems.map(item =>
            item.id === editingId
                ? {
                    ...item,
                    title: modalName,
                    description: modalDescription,
                    dueDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
                    group: selectedGroup === '__new__' ? newGroupName : selectedGroup,
                    pinned: item.pinned 
                }
                : item
        );

        try {
            await saveToLocalStorage();
            console.log("Item edited and saved successfully.");
        } catch (error) {
            console.error("Failed to save edited item:", error);
        }

        defaultModal = false;
        // reset modal fields…
    }

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${modalName}"?`)) {
            checklistItems = checklistItems.filter(i => i.title !== modalName);
            saveToLocalStorage();
            defaultModal = false;
        }
    }

    const handleAdd = () => {
        if (!modalName.trim()) {
            alert("Name cannot be blank.");
            return;
        }
        checklistItems = [
            ...checklistItems,
            {
                id: checklistItems.length + 1,
                title: modalName,
                description: modalDescription,
                checked: false,
                dueDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
                group: selectedGroup === '__new__' ? newGroupName : selectedGroup,
                pinned: false
            }
        ];
        saveToLocalStorage();
        defaultModal = false;
        selectedDate = null;
        selectedGroup = null;
        modalName = '';
        modalDescription = '';
    }

    let sortBy = "dueDate"; 
    
    $: sortedChecklist = [...checklistItems].sort((a, b) => {
        if(sortBy === "dueDate") {
            // Handle missing dates
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if(sortBy === "title") {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });

    $: grouped = sortedChecklist.reduce((acc, item) => {
        (acc[item.group] = acc[item.group] || []).push(item);
        return acc;
    }, {});

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


<main>
    <div class="w-full flex items-center justify-center"> 
        <div class="max-w-[1280px] w-full">
            <!-- <h1 class="text-white text-3xl p-6 font-medium">Your Checklist</h1> -->
            <div class="pl-4 pr-4 w-full overflow-y-auto mt-8" style="padding-bottom: 160px;"> 
                {#if Object.keys(grouped).length === 0}
                    <div class="text-center text-gray-500 dark:text-gray-400">
                        <h2 class="text-2xl font-bold mb-4">No items found</h2>
                        <p class="mb-4">Start by adding your first item!</p>
                        <Button onclick={openModalAdd} color="primary" class="w-full max-w-xs">
                            <CirclePlusSolid class="mr-2" /> Add Item
                        </Button>
                    </div>
                {:else}
                <Accordion>
                    {#each Object.entries(grouped) as [group, items]}
                        <AccordionItem transitionType={blur} transitionParams={{ duration: 300 }}>
                            {#snippet header()}{group} ({items.length} items){/snippet}
                            {#each items
                                .slice()
                                .sort((a, b) => {
                                    if (a.pinned && !b.pinned) return -1;
                                    if (!a.pinned && b.pinned) return 1;
                                    if (a.dueDate && b.dueDate) {
                                        return new Date(a.dueDate) - new Date(b.dueDate);
                                    }
                                    if (a.dueDate) return -1;
                                    if (b.dueDate) return 1;
                                    return 0;
                                }) as item (item.id)}
                                <Card class={`p-2 sm:p-3 md:p-6 w-full max-w-none mt-4 first:mt-0 hover:cursor-pointer border-2 ${
                                    item.checked
                                        ? '!border-green-500'
                                        : (item.dueDate && new Date(item.dueDate) < new Date())
                                            ? '!border-red-500'
                                            : (item.dueDate && (new Date(item.dueDate) - new Date()) < 3 * 24 * 60 * 60 * 1000)
                                                ? '!border-orange-500'
                                                : '!border-gray-700'
                                }`}>
                                    <!-- svelte-ignore component_name_lowercase -->
                                    <button type="button" class="flex items-center gap-5" onclick={(e) => { if(e.currentTarget === e.target) openModalEdit(item); }}>
                                        <Checkbox
                                            bind:checked={item.checked}
                                            onchange={(e) => {
                                                const isChecked = e.target.checked;
                                                checklistItems = checklistItems.map(i =>
                                                    i.id === item.id ? { ...i, checked: isChecked } : i
                                                );
                                                saveToLocalStorage();
                                            }}
                                            class="w-12 h-12 text-5xl p-0" 
                                        />
                                        <h5 class="sm:text-2xl text-lg font-bold tracking-tight text-gray-900 dark:text-white text-left truncate block">
                                            {item.title} 
                                            <br class="sm:hidden">
                                            <span class="sm:hidden text-sm opacity-50 inline-block">
                                                { formatDate(item.dueDate)}
                                            </span>
                                        </h5>
                                        <div class="sm:flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto ml-0 hidden">
                                            <span>
                                                <span
                                                    class:bg-red-700={item.dueDate && new Date(item.dueDate) < new Date() && !item.checked}
                                                    class:bg-orange-700={item.dueDate && new Date(item.dueDate) >= new Date() && (new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000) && !item.checked}
                                                    class:bg-green-700={item.checked}
                                                    class="px-2 py-0.5 rounded text-white"
                                                >
                                                    {#if item.checked}
                                                        Completed
                                                    {:else if item.dueDate && new Date(item.dueDate) < new Date()}
                                                        Overdue by {Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24))} days
                                                    {:else if item.dueDate && new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000}
                                                        Due soon ({formatDate(item.dueDate)})
                                                    {:else}
                                                        Due {formatDate(item.dueDate)}
                                                    {/if}
                                                </span>
                                            </span>
                                        </div>
                                    </button>
                                    <hr class="mb-4 border-gray-700 hidden mt-4">
                                    <div class="sm:hidden flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto ml-0">
                                        <span class="hidden">
                                            <span
                                                class:bg-red-700={item.dueDate && new Date(item.dueDate) < new Date() && !item.checked}
                                                class:bg-orange-700={item.dueDate && new Date(item.dueDate) >= new Date() && (new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000) && !item.checked}
                                                class:bg-green-700={item.checked}
                                                class="px-2 py-0.5 rounded text-white"
                                            >
                                                {#if item.checked}
                                                    Completed
                                                {:else if item.dueDate && new Date(item.dueDate) < new Date()}
                                                    Overdue by {Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24))} days
                                                {:else if item.dueDate && new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000}
                                                    Due soon ({formatDate(item.dueDate)})
                                                {:else}
                                                    Due {formatDate(item.dueDate)}
                                                {/if}
                                            </span>
                                        </span>
                                    </div>
                                    {#if item.description !== ''}
                                        <hr class="mb-4 border-gray-700 mt-4">
                                        <p class="pl-2 pb-2 pr-2 leading-tight font-normal text-gray-700 dark:text-gray-400">{item.description}</p>
                                    {/if}
                                </Card>
                            {/each}
                        </AccordionItem>
                    {/each}
                </Accordion>
                {/if}
            </div>
        </div>
    </div>
    
    <!-- Modal Content -->
    <Modal title={modalMode === "edit" ? "Edit Item" : "Add Item"} bind:open={defaultModal} class="max-h-none relative" bodyClass="overflow-y-auto max-h-none relative">
        <Label class="space-y-2">
            <span>Name</span>
            <Input type="text" name="Name" required bind:value={modalName} />
        </Label>
        <Label class="space-y-2">
            <span>Description</span>
            <Input type="text" name="Description" bind:value={modalDescription} />
        </Label>
        <Label class="space-y-2">
            <span>Date</span>
            <Datepicker bind:value={selectedDate} />
        </Label>
        <Label class="space-y-2">
            <span>Group</span>
            <Select
            class="mt-2"
            items={[
                ...Array.from(new Set(checklistItems.map(i => i.group))).map(group => ({ value: group, name: group })),
                { value: "__new__", name: "Add new group..." }
            ]}
            bind:value={selectedGroup}
            />
            {#if selectedGroup === '__new__'}
            <Input type="text" placeholder="New group name" bind:value={newGroupName} />
            {/if}
        </Label>
        {#if modalMode === 'edit'}
            <div class="flex gap-4">
                <Button class="mt-4 w-full" onclick={handleEdit}>Edit</Button>
                <Button color="red" class="mt-4 w-full" onclick={handleDelete}>Delete</Button>
                <Button
                    color="light"
                    class="mt-4 w-full"
                    onclick={async () => {
                        checklistItems = checklistItems.map(item => 
                            item.id === editingId ? { ...item, pinned: !item.pinned } : item
                        );
                        await saveToLocalStorage();
                        console.log("Toggled pin for item:", modalName);
                        defaultModal = false;
                    }}>
                    {#if checklistItems.find(item => item.id === editingId && item.pinned)}
                        Unpin Item
                    {:else}
                        Pin to Top
                    {/if}
                </Button>
            </div>
        {/if}
        {#if modalMode === 'add'}
            <Button class="mt-4 w-full" onclick={handleAdd}>Add</Button>
        {/if}
    </Modal>
    
    
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <BottomNav position="fixed" navType="application" innerClass="grid-cols-2">
        <!-- <BottomNavItem btnName="Home" appBtnPosition="left">
            <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
        </BottomNavItem>
        <Tooltip arrow={false}>Home</Tooltip> -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div type="button" class="flex items-center justify-center" onclick={() => openModalAdd()}>
            <BottomNavItem btnName="Create new item" appBtnPosition="middle" btnClass="inline-flex items-center justify-center w-10 h-10 font-medium bg-primary-600 rounded-full hover:bg-primary-700 group focus:ring-4 focus:ring-primary-300 focus:outline-hidden dark:focus:ring-primary-800">
            <CirclePlusSolid class="text-white" />
            </BottomNavItem>
            <Tooltip arrow={false}>Create new item</Tooltip>
        </div>
        <BottomNavItem btnName="Settings" appBtnPosition="right" href="/settings">
            <AdjustmentsVerticalOutline class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
        </BottomNavItem>
        <Tooltip arrow={false}>Settings</Tooltip>
    </BottomNav>
</main>

