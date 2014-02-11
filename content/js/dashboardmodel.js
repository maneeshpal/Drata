var defaultWidgetModel = [{
        name: 'widget 1',
        sizex: 1,
        selectedDataKey: 'key1',
        segmentModel: {
            chartType: 'line',
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "a"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "a"
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "a",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            renderType: "group",
                            logic: "+",
                            groups: []
                        },
                        isComplex: false,
                        value: "4"
                    }
                ],
                logic: "and"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        }
    },
    {
        name: 'widget pie',
        sizex: 1,
        selectedDataKey: "key1",
        segmentModel: {
            chartType: 'pie',
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "a"
                    },
                    {
                        prop: "b"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "c",
                groupBy: "sumBy",
                hasGrouping: true
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "b",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            groups: [],
                            logic: "+",
                            renderType: "group"
                        },
                        isComplex: false,
                        value: "12"
                    }
                ],
                renderType: "group"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        }
    },
    {
        name: 'barrr',
        sizex: 2,
        selectedDataKey:"key2",
        segmentModel: {
            chartType:"bar",
            selection: {
                complexGroups: [
                        {
                        groupType:"selections",
                        groups: [
                                {
                                prop:"d",
                                logic:"+",
                                conditionType:"selections",
                                renderType:"condition"
                                },
                                {
                                prop:"e",
                                logic:"+",
                                conditionType:"selections",
                                renderType:"condition"
                                },
                                {
                                groupType:"selections",
                                groups: [],
                                logic:"+",
                                renderType:"group"
                                }
                            ],
                        logic:"+",
                        renderType:"group",
                        selectionName:"d-e"
                        }
                    ],
                props: [
                        {
                        prop:"d"
                        },
                        {
                        prop:"e"
                        },
                        {
                        prop:"timestamp"
                        }
                    ]
                },
            dataGroup: {
                groupByProp:"f",
                groupBy:"sumBy",
                hasGrouping: true
                },
            group: {
                groupType:"conditions",
                groups: [],
                renderType:"group"
                },
            properties: [
                "d",
                "e",
                "f",
                "timestamp"
                ]
            }
        },
        {
            name: 'My Areaaaa',
            sizex: 2,
            selectedDataKey: 'key1',
            segmentModel: {
                chartType: 'area',
                selection: {
                    complexGroups: [],
                    props: [
                        {
                            prop: "a"
                        },
                        {
                            prop: "b"
                        }
                    ]
                },
                dataGroup: {
                    xAxisProp: "timestamp",
                    groupByProp: "a"
                },
                group: {
                    groupType: "conditions",
                    groups: [
                        {
                            prop: "a",
                            logic: "and",
                            conditionType: "conditions",
                            renderType: "condition",
                            operation: ">",
                            selectionGroup: {
                                groupType: "selections",
                                renderType: "group",
                                logic: "+",
                                groups: []
                            },
                            isComplex: false,
                            value: "4"
                        }
                    ],
                    logic: "and"
                },
                properties: [
                    "a",
                    "b",
                    "c",
                    "timestamp"
                ]
            }
        },
        {
            name: 'Scatter Baby',
            sizex: 2,
            selectedDataKey: 'key1',
            segmentModel: {
                chartType: 'scatter',
                selection: {
                    complexGroups: [],
                    props: [
                        {
                            prop: "a"
                        },
                        {
                            prop: "b"
                        }
                    ]
                },
                dataGroup: {
                    xAxisProp: "timestamp",
                    groupByProp: "a"
                },
                group: {
                    groupType: "conditions",
                    groups: [
                        {
                            prop: "a",
                            logic: "and",
                            conditionType: "conditions",
                            renderType: "condition",
                            operation: ">",
                            selectionGroup: {
                                groupType: "selections",
                                renderType: "group",
                                logic: "+",
                                groups: []
                            },
                            isComplex: false,
                            value: "4"
                        }
                    ],
                    logic: "and"
                },
                properties: [
                    "a",
                    "b",
                    "c",
                    "timestamp"
                ]
            }
        },
    ];
    window.dashboardModel = {
        name: 'maneesh',
        widgets: defaultWidgetModel
    };