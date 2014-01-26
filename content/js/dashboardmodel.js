var defaultWidgetModel = [{
        name: 'widget 1',
        selectedDataKey: 'key1',
        segmentModel: {
            chartType: 'stackedArea',
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
    }];
    window.dashboardModel = {
        name: 'maneesh',
        widgets: defaultWidgetModel
    };