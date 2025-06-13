<script>
    import { onMount } from "svelte";
    import { Button, Label, Input, Checkbox, Datepicker, Dropdown, DropdownItem, Select } from "flowbite-svelte";
    import { BottomNav, BottomNavItem, Tooltip, Card, Accordion, AccordionItem, Modal } from "flowbite-svelte";
    import { HomeSolid, AdjustmentsVerticalOutline, CirclePlusSolid } from "flowbite-svelte-icons";
    import { blur, fade } from "svelte/transition";

    let defaultModal = false;
    let checklistItems = [];
    let modalMode = 'edit';

    let selectedDate = null;
    let selectedGroup = null;
    let newGroupName = '';
    let modalName = '';
    let modalDescription = '';

    // Function to generate a random hex key
    function generateRandomHexKey(bytesCount) {
        const randomBytes = new Uint8Array(bytesCount);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    onMount(() => {
        if (!localStorage.getItem("appKey")) {
            const newKey = generateRandomHexKey(16); 
            localStorage.setItem("appKey", newKey);
            console.log("Generated new app key:", newKey);
        } else {
            console.log("Using stored app key:", localStorage.getItem("appKey"));
        }

        const storedItems = localStorage.getItem("checklistItems");
        checklistItems = storedItems ? JSON.parse(storedItems) : [];
    });

    function saveToLocalStorage() {
        localStorage.setItem("checklistItems", JSON.stringify(checklistItems));
    }

    function openModalEdit(item) {
        modalMode = 'edit';
        defaultModal = true;
        modalName = item.title;
        modalDescription = item.description;
        selectedDate = item.dueDate ? new Date(item.dueDate) : null;
        selectedGroup = item.group;
    }

    function openModalAdd() {
        modalMode = 'add';
        defaultModal = true;
        modalName = '';
        modalDescription = '';
        selectedDate = null;
        selectedGroup = '';
    }

    const handleEdit = () => {
        checklistItems = checklistItems.map(i =>
            i.title === modalName
                ? {
                    ...i,
                    title: modalName,
                    description: modalDescription,
                    dueDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
                    group: selectedGroup === '__new__' ? newGroupName : selectedGroup
                }
                : i
        );
        saveToLocalStorage();
        defaultModal = false;
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
                group: selectedGroup === '__new__' ? newGroupName : selectedGroup
            }
        ];
        saveToLocalStorage();
        defaultModal = false;
    }

    $: grouped = checklistItems.reduce((acc, item) => {
        (acc[item.group] = acc[item.group] || []).push(item);
        return acc;
    }, {});
</script>

<div class="w-full flex items-center justify-center"> 
    <div class="max-w-[1280px] w-full">
        <!-- <h1 class="text-white text-3xl p-6 font-medium">Your Checklist</h1> -->
        <div class="pl-4 pr-4 w-full overflow-y-auto mt-8" style="padding-bottom: 160px;"> 
            {#if grouped.length == 0}
                <div class="text-center text-gray-500 dark:text-gray-400">
                    <h2 class="text-2xl font-bold mb-4">No items found</h2>
                    <p class="mb-4">Start by adding your first item!</p>
                    <Button on:click={openModalAdd} color="primary" class="w-full max-w-xs">
                        <CirclePlusSolid class="mr-2" /> Add Item
                    </Button>
                </div>
            {:else}
            <Accordion>
                {#each Object.entries(grouped) as [group, items]}
                    <AccordionItem transitionType={blur} transitionParams={{ duration: 300 }}>
                        {#snippet header()}{group}{/snippet}
                        {#each items as item (item.id)}
                            <Card class="p-4 sm:p-6 md:p-8 w-full max-w-none mt-4 first:mt-0 hover:cursor-pointer">
                                <!-- svelte-ignore component_name_lowercase -->
                                <button type="button" class="flex items-center gap-5 mb-4 flex-wrap" on:click|self={() => openModalEdit(item)}>
                                    <Checkbox
                                        bind:checked={item.checked}
                                        onchange={(e) => {
                                            const isChecked = e.target.checked;
                                            checklistItems = checklistItems.map(i =>
                                                i.id === item.id ? { ...i, checked: isChecked } : i
                                            );
                                            saveToLocalStorage();
                                        }}
                                        class="mb-2 w-12 h-12 text-5xl" 
                                    />
                                    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{item.title}</h5>
                                    <div class="sm:flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto ml-0 hidden">
                                        <span>
                                            <span
                                                class:bg-red-700={new Date(item.dueDate) < new Date() && !item.checked}
                                                class:bg-yellow-400={new Date(item.dueDate) >= new Date() && (new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000) && !item.checked}
                                                class:bg-green-700={item.checked}
                                                class="px-2 py-0.5 rounded text-white"
                                            >
                                                {#if item.checked}
                                                    Completed {item.dueDate}
                                                {:else if new Date(item.dueDate) < new Date()}
                                                    Overdue by {Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24))} days
                                                {:else if new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000}
                                                    Due soon ({item.dueDate})
                                                {:else}
                                                    {item.dueDate}
                                                {/if}
                                            </span>
                                        </span>
                                    </div>
                                </button>
                                <hr class="mb-4 border-gray-700">
                                <div class="sm:hidden flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto ml-0 flex">
                                    <span>
                                        <span
                                            class:bg-red-700={new Date(item.dueDate) < new Date() && !item.checked}
                                            class:bg-yellow-400={new Date(item.dueDate) >= new Date() && (new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000) && !item.checked}
                                            class:bg-green-700={item.checked}
                                            class="px-2 py-0.5 rounded text-white"
                                        >
                                            {#if item.checked}
                                                Completed {item.dueDate}
                                            {:else if new Date(item.dueDate) < new Date()}
                                                Overdue by {Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24))} days
                                            {:else if new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000}
                                                Due soon ({item.dueDate})
                                            {:else}
                                                {item.dueDate}
                                            {/if}
                                        </span>
                                    </span>
                                </div>
                                <hr class="mb-4 border-gray-700 sm:hidden mt-4">
                                <p class="mb-3 leading-tight font-normal text-gray-700 dark:text-gray-400">{item.description}</p>
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
    <div class="flex gap-4">
        {#if modalMode === 'edit'}
            <Button class="mt-4 w-full" onclick={handleEdit}>Edit</Button>
            <Button color="red" class="mt-4 w-full" onclick={handleDelete}>Delete</Button>
        {/if}
        {#if modalMode === 'add'}
            <Button class="mt-4 w-full" onclick={handleAdd}>Add</Button>
        {/if}
    </div>
</Modal>


<!-- svelte-ignore a11y_no_static_element_interactions -->
<BottomNav position="fixed" navType="application" innerClass="grid-cols-2">
    <!-- <BottomNavItem btnName="Home" appBtnPosition="left">
        <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
    </BottomNavItem>
    <Tooltip arrow={false}>Home</Tooltip> -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div type="button" class="flex items-center justify-center" on:click={() => openModalAdd()}>
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
