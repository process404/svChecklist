<script>
    import { onMount } from "svelte";
    import { Button, Label, Input, Checkbox, Datepicker, Dropdown, DropdownItem, Select } from "flowbite-svelte";
    import { BottomNav, BottomNavItem, Tooltip, Card, Accordion, AccordionItem, Modal } from "flowbite-svelte";
    import { HomeSolid, AdjustmentsVerticalOutline, CirclePlusSolid } from "flowbite-svelte-icons";
    import { blur, fade } from "svelte/transition";

    let appKey = null;

    onMount(() => {
        console.log("Settings page mounted");

        if(localStorage.getItem('appKey')){
            appKey = localStorage.getItem('appKey');
        }
    });

</script>

<div class="w-full flex items-center justify-center"> 
    <div class="max-w-[1280px] w-full">
        <h1 class="text-white text-3xl p-6 font-medium">Settings</h1>
        <div class="pl-4 pr-4 w-full overflow-y-auto mt-8" style="padding-bottom: 160px;"> 

        </div>
    </div>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<BottomNav position="fixed" navType="application" innerClass="grid-cols-1">
    <!-- <BottomNavItem btnName="Home" appBtnPosition="left">
        <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
    </BottomNavItem>
    <Tooltip arrow={false}>Home</Tooltip> -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <BottomNavItem btnName="Home" appBtnPosition="middle" btnClass="rounded-l-4xl rounded-r-4xl" href="/">
        <HomeSolid class="group-hover:text-primary-600 dark:group-hover:text-primary-500 mb-1 h-6 w-6 text-gray-500 dark:text-gray-400" />
    </BottomNavItem>
    <Tooltip arrow={false}>Settings</Tooltip>
</BottomNav>