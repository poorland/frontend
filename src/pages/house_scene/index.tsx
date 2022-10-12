import React from 'react';
import { Stack, Box } from "@mui/material";
import CircularProgress, {
    circularProgressClasses,
    CircularProgressProps,
} from '@mui/material/CircularProgress';
import "./index.css"

import House from './house';

function FacebookCircularProgress(props: CircularProgressProps) {
    return (
        <Box sx={{ position: 'relative' }}>
            <CircularProgress
                variant="determinate"
                sx={{
                    color: (theme) =>
                        theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
                }}
                size={40}
                thickness={4}
                {...props}
                value={100}
            />
            <CircularProgress
                variant="indeterminate"
                disableShrink
                sx={{
                    color: (theme) => (theme.palette.mode === 'light' ? '#1a90ff' : '#308fe8'),
                    animationDuration: '550ms',
                    position: 'absolute',
                    left: 0,
                    [`& .${circularProgressClasses.circle}`]: {
                        strokeLinecap: 'round',
                    },
                }}
                size={40}
                thickness={4}
                {...props}
            />
        </Box>
    );
}

export default class TugouMap extends React.Component<any, any> {

    constructor(props: any) {
        super(props);
        this.state = {
            loading: true
        };
    }

    componentDidMount() {
        House(this);
    }

    dismissLoading() {
        this.setState({ loading: false });
    }

    render() {
        return (
            <div>

                {this.state.loading && <Stack
                    id='loading-stack'
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={0}
                >
                    <FacebookCircularProgress />
                </Stack>}
                <div id='tugou-house-map'>
                </div>
            </div>
        );
    }
}