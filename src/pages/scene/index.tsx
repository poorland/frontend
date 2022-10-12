import { useEffect } from 'react';
import { Stack } from "@mui/material";
import "./index.css"
import Scene1 from './scene1';
import Scene2 from './scene2';
import Scene3 from './scene3';

export default function TugouMap() {

    useEffect(() => {
        Scene1();
        Scene2();
        Scene3();
    }, []);

    return <div>
        <Stack id="tugou-map-content" direction="row" justifyContent="center" alignItems="center" spacing={2}>
            <div id='tugou-first-map'>
            </div>
            <div id='tugou-second-map'>
            </div>
            <div id='tugou-third-map'>
            </div>
        </Stack>
    </div>
}